import RevenueCat
import RepoLensCore
import SwiftUI

private enum WorkspaceSection: String, CaseIterable, Identifiable {
    case overview = "Overview"
    case evidence = "Evidence"
    case reproduce = "Reproduce"
    case notes = "Experiment notes"
    case changeTracking = "Change tracking"

    var id: Self { self }

    var icon: String {
        switch self {
        case .overview: "rectangle.grid.2x2"
        case .evidence: "doc.text.magnifyingglass"
        case .reproduce: "terminal"
        case .notes: "square.and.pencil"
        case .changeTracking: "arrow.triangle.2.circlepath"
        }
    }
}

struct ContentView: View {
    @ObservedObject var purchases: PurchaseManager
    @ObservedObject var notes: ExperimentNoteStore

    @State private var selection: WorkspaceSection? = .overview
    @State private var draftNote = ""

    private let report = ResearchReport.segmentAnythingDemo

    var body: some View {
        NavigationSplitView {
            sidebar
        } detail: {
            ZStack {
                Color(nsColor: .windowBackgroundColor).ignoresSafeArea()
                ScrollView {
                    VStack(alignment: .leading, spacing: 22) {
                        reportHeader
                        sectionContent
                    }
                    .padding(28)
                    .frame(maxWidth: 980, alignment: .leading)
                }
            }
        }
        .tint(.indigo)
    }

    private var sidebar: some View {
        List(selection: $selection) {
            Section("Research workspace") {
                ForEach(WorkspaceSection.allCases) { section in
                    Label(section.rawValue, systemImage: section.icon)
                        .badge(section == .changeTracking && !purchases.hasPro ? "PRO" : nil)
                        .tag(section)
                }
            }

            Section("Repository") {
                VStack(alignment: .leading, spacing: 5) {
                    Text(report.repository)
                        .font(.callout.weight(.semibold))
                    Text(String(report.revision.prefix(12)))
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                }
                .padding(.vertical, 4)
            }
        }
        .navigationTitle("RepoLens")
        .frame(minWidth: 240)
    }

    private var reportHeader: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(report.title)
                        .font(.system(size: 31, weight: .bold, design: .rounded))
                    Text(report.summary)
                        .font(.title3)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Label("Revision locked", systemImage: "lock.shield.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.green)
                    .padding(.horizontal, 11)
                    .padding(.vertical, 7)
                    .background(.green.opacity(0.12), in: Capsule())
            }

            HStack(spacing: 10) {
                metric("3", "evidence cards", "doc.text.magnifyingglass")
                metric("3", "grounded commands", "terminal")
                metric(purchases.hasPro ? "ACTIVE" : "FREE", "workspace tier", "checkmark.seal")
            }
        }
    }

    @ViewBuilder
    private var sectionContent: some View {
        switch selection ?? .overview {
        case .overview:
            overview
        case .evidence:
            evidence
        case .reproduce:
            reproduce
        case .notes:
            experimentNotes
        case .changeTracking:
            changeTracking
        }
    }

    private var overview: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionTitle("Understand before you execute", "RepoLens preserves the path from explanation back to source.")
            HStack(alignment: .top, spacing: 14) {
                workflowCard("1", "Trace the mechanism", "Follow SamPredictor from image encoding to prompt-based decoding.", "point.3.connected.trianglepath.dotted")
                workflowCard("2", "Challenge the evidence", "Open the immutable source window behind every repository fact.", "checkmark.shield")
                workflowCard("3", "Plan reproduction", "Separate repository commands from prerequisites and unexecuted steps.", "list.bullet.clipboard")
            }
            trustBoundary
        }
    }

    private var evidence: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionTitle("Evidence index", "Every card is tied to one file, one line range, and one immutable revision.")
            ForEach(report.evidence) { card in
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        Text(card.id)
                            .font(.caption.monospaced().weight(.bold))
                            .foregroundStyle(.indigo)
                        Text(card.title)
                            .font(.headline)
                        Spacer()
                        Link(destination: card.sourceURL) {
                            Label("Open source", systemImage: "arrow.up.right.square")
                        }
                    }
                    Text("\(card.path) · lines \(card.lineRange)")
                        .font(.caption.monospaced())
                        .foregroundStyle(.secondary)
                    Text(card.excerpt)
                        .font(.system(.body, design: .monospaced))
                        .padding(12)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .background(Color.black.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
                    Text(card.explanation)
                        .foregroundStyle(.secondary)
                }
                .cardStyle()
            }
        }
    }

    private var reproduce: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionTitle("Reproduction plan", "Commands are grounded in cited repository evidence and are not presented as already executed.")
            Label("Not yet executed", systemImage: "exclamationmark.triangle.fill")
                .foregroundStyle(.orange)
                .font(.headline)
            ForEach(Array(report.reproductionSteps.enumerated()), id: \.element.id) { index, step in
                HStack(alignment: .top, spacing: 14) {
                    Text("\(index + 1)")
                        .font(.headline.monospaced())
                        .frame(width: 34, height: 34)
                        .background(.indigo.opacity(0.12), in: Circle())
                    VStack(alignment: .leading, spacing: 8) {
                        Text(step.title).font(.headline)
                        Text(step.command)
                            .font(.system(.callout, design: .monospaced))
                            .textSelection(.enabled)
                        Text("Source: \(step.provenance)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .cardStyle()
            }
        }
    }

    private var experimentNotes: some View {
        VStack(alignment: .leading, spacing: 16) {
            sectionTitle("Experiment notes", "Record environment differences and deviations without changing the source report.")
            TextEditor(text: $draftNote)
                .font(.body)
                .frame(minHeight: 110)
                .padding(8)
                .background(Color.black.opacity(0.04), in: RoundedRectangle(cornerRadius: 12))
                .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.secondary.opacity(0.2)))
            HStack {
                Text("Stored locally on this Mac")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                Spacer()
                Button("Save note") {
                    notes.add(draftNote)
                    draftNote = ""
                }
                .buttonStyle(.borderedProminent)
                .disabled(draftNote.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
            }
            ForEach(notes.notes) { note in
                VStack(alignment: .leading, spacing: 7) {
                    Text(note.createdAt.formatted(date: .abbreviated, time: .shortened))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    Text(note.text)
                        .textSelection(.enabled)
                }
                .cardStyle()
            }
        }
    }

    private var changeTracking: some View {
        VStack(alignment: .leading, spacing: 18) {
            sectionTitle("Repository change tracking", "Compare a reviewed report with a newer commit without silently reusing stale evidence.")

            if purchases.hasPro {
                Label("Pro entitlement verified", systemImage: "checkmark.seal.fill")
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(.green)
                VStack(alignment: .leading, spacing: 12) {
                    changeRow("predictor.py", "2 evidence windows changed", .orange)
                    changeRow("README.md", "1 setup command added", .green)
                    changeRow("automatic_mask_generator.py", "No reviewed claims affected", .secondary)
                }
                .cardStyle()

                HStack {
                    Button("Refresh entitlement") {
                        Task { await purchases.refresh() }
                    }
                    Button("Restore purchases") {
                        Task { await purchases.restore() }
                    }
                    .disabled(!purchases.isConfigured || purchases.state == .loading)
                    if purchases.state == .loading {
                        ProgressView().controlSize(.small)
                    }
                }

                Text(purchases.statusMessage)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .textSelection(.enabled)
            } else {
                paywall
            }
        }
    }

    private var paywall: some View {
        VStack(alignment: .leading, spacing: 16) {
            Label("RepoLens Pro", systemImage: "sparkles")
                .font(.title2.weight(.bold))
                .foregroundStyle(.indigo)
            Text("Unlock multiple research collections, revision change tracking, and shared experiment history. Evidence review and local notes remain free.")
                .foregroundStyle(.secondary)
            Divider()

            if purchases.packages.isEmpty {
                Text(purchases.statusMessage)
                    .font(.callout)
            } else {
                ForEach(purchases.packages, id: \.identifier) { package in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(package.storeProduct.localizedTitle)
                                .font(.headline)
                            Text(package.storeProduct.localizedPriceString)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button("Start Test Store purchase") {
                            Task { await purchases.purchase(package) }
                        }
                        .buttonStyle(.borderedProminent)
                        .disabled(purchases.state == .loading)
                    }
                }
            }

            HStack {
                Button("Refresh") {
                    Task { await purchases.configureIfPossible() }
                }
                Button("Restore purchases") {
                    Task { await purchases.restore() }
                }
                .disabled(!purchases.isConfigured || purchases.state == .loading)
                Spacer()
                if purchases.state == .loading {
                    ProgressView().controlSize(.small)
                }
            }

            Text(purchases.statusMessage)
                .font(.caption)
                .foregroundStyle(.secondary)
                .textSelection(.enabled)
        }
        .padding(22)
        .background(
            LinearGradient(
                colors: [.indigo.opacity(0.14), .purple.opacity(0.07)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 18)
        )
        .overlay(RoundedRectangle(cornerRadius: 18).stroke(.indigo.opacity(0.25)))
    }

    private var trustBoundary: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Trust boundary", systemImage: "shield.lefthalf.filled")
                .font(.headline)
            Text("The model proposes structure. The application decides which repository evidence is admissible, locks the revision, validates citations, and preserves unknowns.")
                .foregroundStyle(.secondary)
        }
        .cardStyle()
    }

    private func metric(_ value: String, _ label: String, _ icon: String) -> some View {
        HStack(spacing: 9) {
            Image(systemName: icon).foregroundStyle(.indigo)
            VStack(alignment: .leading, spacing: 1) {
                Text(value).font(.headline.monospaced())
                Text(label).font(.caption).foregroundStyle(.secondary)
            }
        }
        .padding(.horizontal, 13)
        .padding(.vertical, 10)
        .background(Color.black.opacity(0.04), in: RoundedRectangle(cornerRadius: 11))
    }

    private func workflowCard(_ number: String, _ title: String, _ body: String, _ icon: String) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(number)
                    .font(.caption.monospaced().weight(.bold))
                    .foregroundStyle(.indigo)
                Spacer()
                Image(systemName: icon).foregroundStyle(.indigo)
            }
            Text(title).font(.headline)
            Text(body).font(.callout).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private func sectionTitle(_ title: String, _ subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 5) {
            Text(title).font(.title2.weight(.bold))
            Text(subtitle).foregroundStyle(.secondary)
        }
    }

    private func changeRow(_ path: String, _ message: String, _ color: Color) -> some View {
        HStack {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(path).font(.body.monospaced())
            Spacer()
            Text(message).foregroundStyle(.secondary)
        }
    }
}

private extension View {
    func cardStyle() -> some View {
        padding(18)
            .background(Color(nsColor: .controlBackgroundColor), in: RoundedRectangle(cornerRadius: 15))
            .overlay(RoundedRectangle(cornerRadius: 15).stroke(Color.secondary.opacity(0.14)))
    }
}
