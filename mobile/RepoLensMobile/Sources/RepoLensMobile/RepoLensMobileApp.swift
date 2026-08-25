import AppKit
import SwiftUI

final class RepoLensAppDelegate: NSObject, NSApplicationDelegate {
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.activate(ignoringOtherApps: true)
    }
}

@main
struct RepoLensMobileApp: App {
    @NSApplicationDelegateAdaptor(RepoLensAppDelegate.self) private var appDelegate
    @StateObject private var purchases = PurchaseManager()
    @StateObject private var notes = ExperimentNoteStore()

    var body: some Scene {
        WindowGroup {
            ContentView(purchases: purchases, notes: notes)
                .frame(minWidth: 1040, minHeight: 700)
                .task {
                    await purchases.configureIfPossible()
                }
        }
        .windowStyle(.titleBar)
    }
}
