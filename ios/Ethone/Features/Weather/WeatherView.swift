import SwiftUI

struct WeatherView: View {
    @Environment(AppModel.self) private var model
    @AppStorage("weatherCity") private var storedCity = ""
    @State private var weather = WeatherService()
    @State private var accountCity = ""
    @State private var cityField = ""
    @State private var editingCity = false

    private var city: String {
        if !storedCity.isEmpty { return storedCity }
        return accountCity.isEmpty ? "Paris" : accountCity
    }

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
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button { cityField = city; editingCity = true } label: { Image(systemName: "magnifyingglass") }
            }
        }
        .refreshable { await weather.load(city: city) }
        .task {
            await loadAccountCity()
            await weather.load(city: city)
        }
        .onChange(of: storedCity) { _, _ in Task { await weather.load(city: city) } }
        .alert("Changer de ville", isPresented: $editingCity) {
            TextField("Ville", text: $cityField)
            Button("Valider") { storedCity = cityField.trimmingCharacters(in: .whitespaces) }
            Button("Annuler", role: .cancel) {}
        }
    }

    private func loadAccountCity() async {
        // Même ville que sur le site (réglage « liveWeatherCity » du compte).
        struct Row: Decodable { let settings: JSONValue? }
        if let rows: [Row] = try? await model.api.list("user_settings"),
           let value = rows.first?.settings?["liveWeatherCity"]?.stringValue {
            accountCity = value
        }
    }

    private func currentCard(_ now: WeatherNow) -> some View {
        GlassCard(tint: (now.isDay ? Color.blue : Color.indigo).opacity(0.25), padding: 22) {
            VStack(alignment: .leading, spacing: 8) {
                Text(weather.placeName).font(.headline)
                HStack(alignment: .firstTextBaseline) {
                    Text("\(Int(now.temperature.rounded()))°").font(.system(size: 76, weight: .thin, design: .rounded))
                    Spacer()
                    Image(systemName: WeatherCode.symbol(now.code, isDay: now.isDay))
                        .symbolRenderingMode(.multicolor)
                        .font(.system(size: 54))
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
                ForEach(weather.days) { day in
                    HStack {
                        Text(weekday(day.date)).frame(width: 90, alignment: .leading)
                        Image(systemName: WeatherCode.symbol(day.code)).symbolRenderingMode(.multicolor)
                        if day.rainChance >= 20 { Text("\(day.rainChance)%").font(.caption).foregroundStyle(.cyan) }
                        Spacer()
                        Text("\(Int(day.min.rounded()))°").foregroundStyle(.secondary)
                        Text("\(Int(day.max.rounded()))°").fontWeight(.semibold)
                    }
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
