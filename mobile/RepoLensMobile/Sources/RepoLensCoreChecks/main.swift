import RepoLensCore

private func require(_ condition: @autoclosure () -> Bool, _ message: String) {
    guard condition() else {
        fatalError("Entitlement policy check failed: \(message)")
    }
}

require(
    EntitlementPolicy.isUnlocked(.evidenceReview, hasPro: false),
    "evidence review must remain free"
)
require(
    EntitlementPolicy.isUnlocked(.localExperimentNotes, hasPro: false),
    "local experiment notes must remain free"
)
require(
    !EntitlementPolicy.isUnlocked(.multipleResearchCollections, hasPro: false),
    "multiple collections must require Pro"
)
require(
    !EntitlementPolicy.isUnlocked(.repositoryChangeTracking, hasPro: false),
    "change tracking must require Pro"
)
require(
    !EntitlementPolicy.isUnlocked(.teamWorkspace, hasPro: false),
    "team workspace must require Pro"
)

for feature in PremiumFeature.allCases {
    require(
        EntitlementPolicy.isUnlocked(feature, hasPro: true),
        "Pro must unlock \(feature.rawValue)"
    )
}

print("RepoLensCoreChecks passed: free trust features and Pro gates are mapped correctly.")
