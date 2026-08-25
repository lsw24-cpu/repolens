import Foundation

public struct ResearchReport: Codable, Identifiable, Sendable {
    public let id: UUID
    public let repository: String
    public let revision: String
    public let title: String
    public let summary: String
    public let evidence: [EvidenceCard]
    public let reproductionSteps: [ReproductionStep]

    public init(
        id: UUID = UUID(),
        repository: String,
        revision: String,
        title: String,
        summary: String,
        evidence: [EvidenceCard],
        reproductionSteps: [ReproductionStep]
    ) {
        self.id = id
        self.repository = repository
        self.revision = revision
        self.title = title
        self.summary = summary
        self.evidence = evidence
        self.reproductionSteps = reproductionSteps
    }
}

public struct EvidenceCard: Codable, Identifiable, Sendable {
    public let id: String
    public let title: String
    public let path: String
    public let lineRange: String
    public let excerpt: String
    public let explanation: String
    public let sourceURL: URL

    public init(
        id: String,
        title: String,
        path: String,
        lineRange: String,
        excerpt: String,
        explanation: String,
        sourceURL: URL
    ) {
        self.id = id
        self.title = title
        self.path = path
        self.lineRange = lineRange
        self.excerpt = excerpt
        self.explanation = explanation
        self.sourceURL = sourceURL
    }
}

public struct ReproductionStep: Codable, Identifiable, Sendable {
    public let id: UUID
    public let title: String
    public let command: String
    public let provenance: String
    public let executed: Bool

    public init(
        id: UUID = UUID(),
        title: String,
        command: String,
        provenance: String,
        executed: Bool = false
    ) {
        self.id = id
        self.title = title
        self.command = command
        self.provenance = provenance
        self.executed = executed
    }
}

public struct ExperimentNote: Codable, Identifiable, Sendable {
    public let id: UUID
    public let createdAt: Date
    public let text: String

    public init(id: UUID = UUID(), createdAt: Date = Date(), text: String) {
        self.id = id
        self.createdAt = createdAt
        self.text = text
    }
}

public enum PremiumFeature: String, CaseIterable, Sendable {
    case evidenceReview
    case localExperimentNotes
    case multipleResearchCollections
    case repositoryChangeTracking
    case teamWorkspace
}

public enum EntitlementPolicy {
    public static func isUnlocked(_ feature: PremiumFeature, hasPro: Bool) -> Bool {
        switch feature {
        case .evidenceReview, .localExperimentNotes:
            return true
        case .multipleResearchCollections, .repositoryChangeTracking, .teamWorkspace:
            return hasPro
        }
    }
}
