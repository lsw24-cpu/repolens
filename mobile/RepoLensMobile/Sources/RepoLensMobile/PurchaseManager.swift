import Foundation
import RevenueCat

@MainActor
final class PurchaseManager: ObservableObject {
    enum ConnectionState: Equatable {
        case configurationNeeded
        case loading
        case ready
        case error(String)
    }

    @Published private(set) var state: ConnectionState = .configurationNeeded
    @Published private(set) var packages: [RevenueCat.Package] = []
    @Published private(set) var hasPro = false
    @Published private(set) var statusMessage = "Add a RevenueCat Test Store key to verify purchases."

    private let entitlementID = "repolens_pro"
    private var configured = false

    var isConfigured: Bool { configured }

    func configureIfPossible() async {
        guard !configured else {
            await refresh()
            return
        }

        guard let apiKey = ProcessInfo.processInfo.environment["REPOLENS_RC_API_KEY"],
              apiKey.hasPrefix("test_"),
              !apiKey.contains("YOUR_") else {
            state = .configurationNeeded
            statusMessage = "Development mode: set REPOLENS_RC_API_KEY to a RevenueCat Test Store public key."
            return
        }

        Purchases.logLevel = .debug
        Purchases.configure(withAPIKey: apiKey, appUserID: stableAppUserID)
        configured = true
        await refresh()
    }

    func refresh() async {
        guard configured else {
            state = .configurationNeeded
            return
        }

        state = .loading
        statusMessage = "Checking entitlement and current offering…"

        do {
            async let customerInfoRequest = Purchases.shared.customerInfo()
            async let offeringsRequest = Purchases.shared.offerings()
            let (customerInfo, offerings) = try await (customerInfoRequest, offeringsRequest)
            updateEntitlement(from: customerInfo)
            packages = offerings.current?.availablePackages ?? []
            state = .ready
            statusMessage = hasPro ? "Pro entitlement is active." : "Free workspace active. Pro features remain locked."
        } catch {
            state = .error(error.localizedDescription)
            statusMessage = "RevenueCat could not refresh: \(error.localizedDescription)"
        }
    }

    func purchase(_ package: RevenueCat.Package) async {
        guard configured else { return }
        state = .loading
        statusMessage = "Waiting for the Test Store purchase result…"

        do {
            let result = try await Purchases.shared.purchase(package: package)
            updateEntitlement(from: result.customerInfo)
            state = .ready
            statusMessage = result.userCancelled
                ? "Purchase cancelled. Nothing was charged."
                : (hasPro ? "Purchase verified. Pro is now unlocked." : "Purchase completed without the pro entitlement.")
        } catch {
            state = .error(error.localizedDescription)
            statusMessage = "Purchase failed: \(error.localizedDescription)"
        }
    }

    func restore() async {
        guard configured else { return }
        state = .loading
        statusMessage = "Restoring purchases…"

        do {
            let customerInfo = try await Purchases.shared.restorePurchases()
            updateEntitlement(from: customerInfo)
            state = .ready
            statusMessage = hasPro ? "Restore verified. Pro is active." : "No active pro entitlement was found."
        } catch {
            state = .error(error.localizedDescription)
            statusMessage = "Restore failed: \(error.localizedDescription)"
        }
    }

    private func updateEntitlement(from customerInfo: CustomerInfo) {
        hasPro = customerInfo.entitlements.all[entitlementID]?.isActive == true
    }

    private var stableAppUserID: String {
        let key = "repolens.revenuecat.appUserID"
        if let existing = UserDefaults.standard.string(forKey: key) {
            return existing
        }
        let generated = "repolens-student-\(UUID().uuidString.lowercased())"
        UserDefaults.standard.set(generated, forKey: key)
        return generated
    }
}
