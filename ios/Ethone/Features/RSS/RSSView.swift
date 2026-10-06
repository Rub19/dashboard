import SwiftUI

struct RSSView: View {
    @Environment(AppModel.self) private var model
    @Environment(\.openURL) private var openURL
    @State private var address = UserDefaults.standard.string(forKey: "ethone.rss.url") ?? ""
    @State private var feed: Feed?
    @State private var loading = false
    @State private var errorMessage: String?

    struct Entry: Identifiable {
        let id = UUID()
        let title: String
        let link: URL?
        let summary: String
        let date: Date?
    }

    struct Feed {
        let title: String
        let description: String
        let entries: [Entry]
    }

    var body: some View {
        List {
            Section {
                TextField("https://exemple.com/flux.xml", text: $address)
                    .keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    .submitLabel(.go).onSubmit { Task { await load() } }
                Button {
                    Task { await load() }
                } label: {
                    HStack { Text("Charger"); if loading { Spacer(); ProgressView() } }
                }
                .disabled(loading || Self.httpURL(address) == nil)
            }
            .listRowBackground(GlassRowBackground())

            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }

            if let feed {
                Section {
                    ForEach(feed.entries) { entry in
                        Button {
                            if let link = entry.link { openURL(link) }
                        } label: {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(entry.title).font(.headline).foregroundStyle(.primary).multilineTextAlignment(.leading)
                                if !entry.summary.isEmpty {
                                    Text(entry.summary).font(.subheadline).foregroundStyle(.secondary).lineLimit(2).multilineTextAlignment(.leading)
                                }
                                if let date = entry.date {
                                    Text(date, format: .dateTime.day().month(.abbreviated).hour().minute()).font(.caption).foregroundStyle(.tertiary)
                                }
                            }
                        }
                        .listRowBackground(GlassRowBackground())
                        .disabled(entry.link == nil)
                    }
                } header: {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(feed.title).font(.headline).textCase(nil).foregroundStyle(.primary)
                        if !feed.description.isEmpty { Text(feed.description).font(.footnote).textCase(nil) }
                    }
                }
            }
        }
        .scrollContentBackground(.hidden)
        .navigationTitle("RSS")
        .navigationBarTitleDisplayMode(.inline)
        .ethoneScreen()
    }

    private static func httpURL(_ raw: String) -> URL? {
        guard let url = URL(string: raw.trimmingCharacters(in: .whitespaces)), let scheme = url.scheme?.lowercased(),
              scheme == "http" || scheme == "https", url.host != nil else { return nil }
        return url
    }

    private static func stripTags(_ value: String) -> String {
        value.replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "\\s+", with: " ", options: .regularExpression)
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func load() async {
        guard let url = Self.httpURL(address) else { return }
        loading = true
        defer { loading = false }
        UserDefaults.standard.set(url.absoluteString, forKey: "ethone.rss.url")
        do {
            let raw: JSONValue = try await model.api.worker("api/rss", query: [URLQueryItem(name: "url", value: url.absoluteString)])
            let entries = (raw["items"]?.arrayValue ?? []).map { item in
                Entry(
                    title: item["title"]?.stringValue ?? "Sans titre",
                    link: item["link"]?.stringValue.flatMap(Self.httpURL),
                    summary: Self.stripTags(item["description"]?.stringValue ?? ""),
                    date: item["pubDate"]?.stringValue.flatMap { ISODate.parse($0) ?? Self.rfc822($0) }
                )
            }
            feed = Feed(title: raw["title"]?.stringValue ?? url.host ?? "Flux", description: Self.stripTags(raw["description"]?.stringValue ?? ""), entries: entries)
            errorMessage = entries.isEmpty ? "Ce flux ne contient aucun article." : nil
        } catch {
            feed = nil
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private static func rfc822(_ raw: String) -> Date? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        for format in ["EEE, dd MMM yyyy HH:mm:ss Z", "EEE, dd MMM yyyy HH:mm:ss zzz", "dd MMM yyyy HH:mm:ss Z"] {
            formatter.dateFormat = format
            if let date = formatter.date(from: raw) { return date }
        }
        return nil
    }
}

