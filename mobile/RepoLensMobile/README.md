# RepoLens Mobile

RepoLens Mobile is the native macOS companion to the RepoLens web application. It keeps repository evidence, reproduction steps, and experiment notes available in a focused workspace.

## Product boundary

- Free: evidence review, immutable source links, one local experiment log, and grounded reproduction steps.
- Pro: multiple research collections, repository-change tracking, and team history.

The core trust features remain free. Premium features correspond to recurring compute, storage, or synchronization costs.

## Run the free workspace

Requirements: macOS 13 or later and Swift 6.

```bash
swift run RepoLensMobile
```

## Download the macOS preview

Download the universal macOS archive from the [latest GitHub release](https://github.com/lsw24-cpu/repolens/releases/latest), unzip it, and open `RepoLens.app`. The preview supports both Apple silicon and Intel Macs running macOS 13 or later.

The archive is ad-hoc signed so its contents can be verified without a paid Apple developer account. Because it is not Apple-notarized, macOS may require **Control-click → Open** the first time. The free evidence workspace works without an API key; RevenueCat Test Store purchase verification requires a developer-provided public test key.

Maintainers can build the downloadable archive with:

```bash
./scripts/package_app.sh 1.0.0
```

## Connect RevenueCat Test Store

1. Create a RevenueCat project and use its automatically provisioned Test Store.
2. Create the `repolens_pro` entitlement (display name: RepoLens Pro).
3. Create a Test Store product and attach it to the current offering.
4. Launch with the Test Store public SDK key:

```bash
REPOLENS_RC_API_KEY=test_your_public_test_store_key swift run RepoLensMobile
```

The key is read from the environment and is never committed. Test Store purchases update `CustomerInfo`, unlock change tracking through the `repolens_pro` entitlement, and can be restored from the app.

Never publish a store build with a Test Store key. A production build must use the platform-specific public SDK key.

## Verify

```bash
swift run RepoLensCoreChecks
REPOLENS_RC_API_KEY=test_your_public_test_store_key swift run RepoLensRevenueCatCheck
swift build -c release
```

The executable policy checks verify that evidence review and local notes stay free while recurring-cost features require the Pro entitlement. This repository uses a framework-free check because the minimal macOS command-line toolchain may not bundle XCTest.
