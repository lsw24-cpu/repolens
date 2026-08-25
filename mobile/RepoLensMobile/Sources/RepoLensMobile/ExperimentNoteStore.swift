import Foundation
import RepoLensCore

@MainActor
final class ExperimentNoteStore: ObservableObject {
    @Published private(set) var notes: [ExperimentNote] = []

    private let defaultsKey = "repolens.mobile.experimentNotes"

    init() {
        guard let data = UserDefaults.standard.data(forKey: defaultsKey),
              let decoded = try? JSONDecoder().decode([ExperimentNote].self, from: data) else {
            return
        }
        notes = decoded
    }

    func add(_ text: String) {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        notes.insert(ExperimentNote(text: trimmed), at: 0)
        persist()
    }

    func remove(at offsets: IndexSet) {
        notes.remove(atOffsets: offsets)
        persist()
    }

    private func persist() {
        guard let data = try? JSONEncoder().encode(notes) else { return }
        UserDefaults.standard.set(data, forKey: defaultsKey)
    }
}
