import Darwin
import Foundation
import RevenueCat

@main
struct RepoLensRevenueCatCheck {
    static func main() async {
        guard let apiKey = ProcessInfo.processInfo.environment["REPOLENS_RC_API_KEY"],
              apiKey.hasPrefix("test_") else {
            fputs("REPOLENS_RC_API_KEY must contain a RevenueCat Test Store key.\n", stderr)
            exit(2)
        }

        Purchases.logLevel = .warn
        let verificationUserID: String = "repolens-build-verification"
        Purchases.configure(
            with: Configuration.Builder(withAPIKey: apiKey)
                .with(appUserID: verificationUserID)
        )

        do {
            async let offeringsRequest = Purchases.shared.offerings()
            async let customerInfoRequest = Purchases.shared.customerInfo()
            let (offerings, customerInfo) = try await (offeringsRequest, customerInfoRequest)

            guard let current = offerings.current else {
                fputs("RevenueCat check failed: no current offering.\n", stderr)
                exit(3)
            }

            guard !current.availablePackages.isEmpty else {
                fputs("RevenueCat check failed: current offering has no packages.\n", stderr)
                exit(4)
            }

            let packageIDs = current.availablePackages.map(\.identifier).joined(separator: ", ")
            let hasPro = customerInfo.entitlements.all["repolens_pro"]?.isActive == true

            print("RevenueCat connection passed.")
            print("Current offering: \(current.identifier)")
            print("Packages: \(packageIDs)")
            print("repolens_pro active for verification user: \(hasPro)")
        } catch {
            fputs("RevenueCat check failed: \(error.localizedDescription)\n", stderr)
            exit(5)
        }
    }
}
