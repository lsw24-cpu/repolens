// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "RepoLensMobile",
    platforms: [
        .macOS(.v13)
    ],
    products: [
        .executable(name: "RepoLensMobile", targets: ["RepoLensMobile"]),
        .executable(name: "RepoLensCoreChecks", targets: ["RepoLensCoreChecks"]),
        .executable(name: "RepoLensRevenueCatCheck", targets: ["RepoLensRevenueCatCheck"])
    ],
    dependencies: [
        .package(
            url: "https://github.com/RevenueCat/purchases-ios-spm.git",
            .upToNextMajor(from: "5.43.0")
        )
    ],
    targets: [
        .target(name: "RepoLensCore"),
        .executableTarget(
            name: "RepoLensMobile",
            dependencies: [
                "RepoLensCore",
                .product(name: "RevenueCat", package: "purchases-ios-spm")
            ]
        ),
        .executableTarget(
            name: "RepoLensCoreChecks",
            dependencies: ["RepoLensCore"]
        ),
        .executableTarget(
            name: "RepoLensRevenueCatCheck",
            dependencies: [
                .product(name: "RevenueCat", package: "purchases-ios-spm")
            ]
        )
    ],
    swiftLanguageModes: [.v5]
)
