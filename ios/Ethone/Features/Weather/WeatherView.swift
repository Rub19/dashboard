import CoreLocation
import SwiftUI

/// One-shot "where am I" for the weather city, asking permission the first time.
@MainActor
final class OneShotLocation: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()
    private var continuation: CheckedContinuation<CLLocation?, Never>?

    func current() async -> CLLocation? {
        await withCheckedContinuation { continuation in
            self.continuation = continuation
            manager.delegate = self
            switch manager.authorizationStatus {
            case .notDetermined: manager.requestWhenInUseAuthorization()
            case .denied, .restricted: finish(nil)
            default: manager.requestLocation()
            }
        }
    }

    private func finish(_ location: CLLocation?) {
        continuation?.resume(returning: location)
        continuation = nil
    }

    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            switch status {
            case .authorizedWhenInUse, .authorizedAlways: self.manager.requestLocation()
            case .denied, .restricted: self.finish(nil)
            default: break
            }
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        let location = locations.first
        Task { @MainActor in self.finish(location) }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in self.finish(nil) }
    }
}

struct WeatherView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("weatherCity") private var cachedCity = ""
    @State private var weather = WeatherService()
    @State private var cityField = ""
    @State private var editingCity = false
    @State private var locating = false
    @State private var locator = OneShotLocation()

    /// The account city (shared with the website) is the reference; the local copy only avoids a flash of "Paris".
    private var city: String { cachedCity.isEmpty ? "Paris" : cachedCity }

    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                if let now = weather.now {
                    currentCard(now)
                    hourlyCard
                    dailyCard
                    detailsGrid(now)
                } else if weather.isLoading {
                    ProgressView().padding(.top, 60)
                }

                if let message = weather.errorMessage {
                    GlassCard(tint: Theme.danger.opacity(0.2)) { Text(message).font(.subheadline) }
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 24)
        }
        .navigationTitle("Météo")
        .ethoneScreen()
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button("Choisir une ville", systemImage: "magnifyingglass") { cityField = city; editingCity = true }
                    Button("Ma position", systemImage: "location.fill") { Task { await useMyLocation() } }
                } label: {
                    if locating { ProgressView() } else { Label(city, systemImage: "location.fill").labelStyle(.titleAndIcon) }
                }
                .accessibilityLabel("Changer de ville")
            }
        }
        .refreshable {
            await loadAccountCity()
            await weather.load(city: city)
        }
        .task {
            await loadAccountCity()
            await weather.load(city: city)
        }
        .reloadOnRemoteChange(["user_settings"]) {
            await loadAccountCity()
            await weather.load(city: city)
        }
        .alert("Changer de ville", isPresented: $editingCity) {
            TextField("Ville", text: $cityField)
            Button("Valider") { Task { await setCity(cityField) } }
            Button("Annuler", role: .cancel) {}
        } message: {
            Text("La ville est enregistrée sur votre compte : le site l'utilise aussi.")
        }
    }

    private struct SettingsRow: Decodable { let settings: JSONValue? }

    private func loadAccountCity() async {
        if let rows: [SettingsRow] = try? await model.api.list("user_settings"),
           let value = rows.first?.settings?["liveWeatherCity"]?.stringValue, !value.isEmpty {
            cachedCity = value
        }
    }

    /// Saves the city into the account settings (read-modify-write of the JSON), so the website follows.
    private func setCity(_ raw: String) async {
        let value = raw.trimmingCharacters(in: .whitespaces)
        guard value.count >= 2 else { return }
        cachedCity = value
        await weather.load(city: value)
        guard weather.errorMessage == nil,
              let rows: [SettingsRow] = try? await model.api.list("user_settings"),
              case .object(var settings)? = rows.first?.settings else { return }
        settings["liveWeatherCity"] = .string(value)
        _ = try? await model.api.upsert("user_settings", fields: ["settings": .object(settings)], conflict: "user_id", as: SettingsRow.self)
    }

    private func useMyLocation() async {
        locating = true
        defer { locating = false }
        guard let location = await locator.current(),
              let place = try? await CLGeocoder().reverseGeocodeLocation(location).first,
              let name = place.locality ?? place.subAdministrativeArea else {
            weather.errorMessage = "Position introuvable. Autorisez la localisation pour ETHONE dans Réglages."
            return
        }
        await setCity(name)
    }

    private func currentCard(_ now: WeatherNow) -> some View {
        GlassCard(tint: (now.isDay ? Color.blue : Color.indigo).opacity(0.25), padding: 22) {
            VStack(alignment: .leading, spacing: 8) {
                Text(weather.placeName).font(.headline)
                HStack(alignment: .firstTextBaseline) {
                    Text("\(Int(now.temperature.rounded()))°").font(.system(size: 80, weight: .light)).tracking(-3)
                        .contentTransition(.numericText())
                    Spacer()
                    Image(systemName: WeatherCode.symbol(now.code, isDay: now.isDay))
                        .symbolRenderingMode(.multicolor)
                        .font(.system(size: 54))
                        .symbolEffect(.breathe, options: .speed(0.4))
                }
                Text(WeatherCode.label(now.code)).font(.title3)
                Text("Ressenti \(Int(now.feelsLike.rounded()))°").foregroundStyle(.secondary)
            }
        }
    }

    private var hourlyCard: some View {
        GlassCard(padding: 14) {
            VStack(alignment: .leading, spacing: 10) {
                Text("Prochaines heures").sectionTitle()
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 18) {
                        ForEach(weather.hours) { hour in
                            VStack(spacing: 6) {
                                Text(hour.hourLabel).font(.caption).foregroundStyle(.secondary)
                                Image(systemName: WeatherCode.symbol(hour.code, isDay: hour.isDay)).symbolRenderingMode(.multicolor).font(.title3)
                                Text("\(Int(hour.temperature.rounded()))°").font(.subheadline.weight(.semibold))
                                if hour.rainChance >= 20 {
                                    Text("\(hour.rainChance)%").font(.caption2).foregroundStyle(.cyan)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    private var dailyCard: some View {
        GlassCard(padding: 14) {
            VStack(alignment: .leading, spacing: 12) {
                Text("7 jours").sectionTitle()
                let low = weather.days.map(\.min).min() ?? 0
                let high = weather.days.map(\.max).max() ?? 1
                ForEach(weather.days) { day in
                    HStack(spacing: 10) {
                        Text(weekday(day.date)).frame(width: 96, alignment: .leading).lineLimit(1)
                        Image(systemName: WeatherCode.symbol(day.code)).symbolRenderingMode(.multicolor).frame(width: 26)
                        Text(day.rainChance >= 20 ? "\(day.rainChance)%" : "")
                            .font(.caption.weight(.medium)).foregroundStyle(.cyan).frame(width: 34, alignment: .leading)
                        Text("\(Int(day.min.rounded()))°").foregroundStyle(.secondary).monospacedDigit().frame(width: 32, alignment: .trailing)
                        GeometryReader { geo in
                            let span = max(high - low, 1)
                            let start = (day.min - low) / span
                            let end = (day.max - low) / span
                            Capsule().fill(.primary.opacity(0.1))
                                .overlay(alignment: .leading) {
                                    Capsule()
                                        .fill(LinearGradient(colors: [.cyan, .yellow, .orange], startPoint: .leading, endPoint: .trailing))
                                        .frame(width: max(geo.size.width * (end - start), 6))
                                        .offset(x: geo.size.width * start)
                                }
                        }
                        .frame(height: 5)
                        Text("\(Int(day.max.rounded()))°").fontWeight(.semibold).monospacedDigit().frame(width: 32, alignment: .trailing)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
        }
    }

    private func detailsGrid(_ now: WeatherNow) -> some View {
        GlassEffectContainer(spacing: 12) {
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)], spacing: 12) {
                detail("Humidité", "\(now.humidity) %", "humidity.fill")
                detail("Vent", "\(Int(now.wind.rounded())) km/h", "wind")
                detail("Rafales", "\(Int(now.gusts.rounded())) km/h", "tornado")
                detail("Pression", "\(Int(now.pressure.rounded())) hPa", "gauge.with.dots.needle.33percent")
            }
        }
    }

    private func detail(_ title: String, _ value: String, _ symbol: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Label(title, systemImage: symbol).font(.caption).foregroundStyle(.secondary)
            Text(value).font(.title3.weight(.semibold))
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .glassEffect(.regular, in: .rect(cornerRadius: 20))
    }

    private func weekday(_ key: String) -> String {
        guard let date = DayKey.date(key) else { return key }
        if Calendar.current.isDateInToday(date) { return "Aujourd'hui" }
        return date.formatted(.dateTime.weekday(.wide)).capitalized
    }
}

