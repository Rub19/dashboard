import SwiftUI
import UserNotifications

struct BillRecord: Identifiable, Decodable, Hashable {
    let id: String
    var label: String
    var data: JSONValue?

    var amount: Double { data?["amount"]?.doubleValue ?? 0 }
    var currency: String { data?["currency"]?.stringValue ?? "€" }
    var dueKey: String { data?["date"]?.stringValue ?? "" }
    var dueDate: Date? { DayKey.date(dueKey) }
    var paid: Bool { data?["paid"]?.boolValue ?? false }
    var recurrence: String { data?["recurrence"]?.stringValue ?? "none" }

    var amountText: String {
        let text = amount.formatted(.number.precision(.fractionLength(0...2)))
        return currency == "€" ? "\(text) €" : "\(text) \(currency)"
    }
}

/// Factures et abonnements (`ethone_user_data`, kind = bill, via le Worker). Le calendrier de factures du site est stocké
/// dans le navigateur : les factures créées ici ne s'y retrouvent donc pas pour l'instant.
struct BillsView: View {
    @Environment(AppModel.self) private var model
    @State private var bills: [BillRecord] = []
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var adding = false

    private var unpaid: [BillRecord] { bills.filter { !$0.paid }.sorted { ($0.dueDate ?? .distantFuture) < ($1.dueDate ?? .distantFuture) } }
    private var paid: [BillRecord] { bills.filter(\.paid).sorted { ($0.dueDate ?? .distantPast) > ($1.dueDate ?? .distantPast) } }
    private var monthTotal: Double {
        let calendar = Calendar.current
        return unpaid.filter { bill in bill.dueDate.map { calendar.isDate($0, equalTo: Date(), toGranularity: .month) } ?? false }.reduce(0) { $0 + $1.amount }
    }

    var body: some View {
        List {
            if let errorMessage {
                Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger).listRowBackground(Color.clear)
            }
            if !unpaid.isEmpty {
                Section {
                    HStack {
                        Label("À payer ce mois-ci", systemImage: "eurosign.circle.fill")
                        Spacer()
                        Text(monthTotal.formatted(.number.precision(.fractionLength(0...2))) + " €").font(.headline.monospacedDigit())
                    }
                    .listRowBackground(GlassRowBackground())
                }
            }
            Section {
                ForEach(unpaid) { row($0) }
            } header: { if !unpaid.isEmpty { Text("À payer · \(unpaid.count)").sectionTitle() } }
            Section {
                ForEach(paid) { row($0) }
            } header: { if !paid.isEmpty { Text("Payées").sectionTitle() } }
        }
        .scrollContentBackground(.hidden)
        .overlay {
            if bills.isEmpty && !loading {
                ContentUnavailableView("Aucune facture", systemImage: "eurosign.circle", description: Text("Ajoutez une facture ou un abonnement."))
            }
        }
        .navigationTitle("Factures")
        .ethoneScreen()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) { Button { adding = true } label: { Image(systemName: "plus") } }
        }
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $adding) { AddBillSheet { await load() } }
    }

    private func row(_ bill: BillRecord) -> some View {
        HStack(spacing: 14) {
            Button { togglePaid(bill) } label: {
                Image(systemName: bill.paid ? "checkmark.circle.fill" : "circle")
                    .font(.title2)
                    .foregroundStyle(bill.paid ? Theme.success : Color.secondary)
            }
            .buttonStyle(.plain)
            VStack(alignment: .leading, spacing: 2) {
                Text(bill.label).strikethrough(bill.paid)
                if let date = bill.dueDate {
                    Text(date, format: .dateTime.day().month(.wide)).font(.caption)
                        .foregroundStyle(!bill.paid && date < Calendar.current.startOfDay(for: Date()) ? Theme.danger : .secondary)
                }
            }
            Spacer()
            Text(bill.amountText).font(.subheadline.monospacedDigit())
        }
        .listRowBackground(GlassRowBackground())
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) { remove(bill) } label: { Label("Supprimer", systemImage: "trash") }
        }
    }

    private func load() async {
        loading = true
        defer { loading = false }
        do {
            bills = try await model.api.worker("api/user-data/bills", as: [BillRecord].self)
            errorMessage = nil
        } catch {
            errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
        }
    }

    private func togglePaid(_ bill: BillRecord) {
        guard let index = bills.firstIndex(where: { $0.id == bill.id }) else { return }
        var object: [String: JSONValue] = [:]
        if case .object(let existing)? = bills[index].data { object = existing }
        let nextPaid = !bill.paid
        object["paid"] = .bool(nextPaid)
        let before = bills[index]
        bills[index].data = .object(object)
        Task {
            do {
                try await model.api.workerVoid("api/user-data/bills", method: "PATCH", body: APIClient.json(["id": .string(bill.id), "data": .object(object)]))
                if nextPaid { UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["bill-\(bill.id)"]) }
            } catch {
                if let current = bills.firstIndex(where: { $0.id == bill.id }) { bills[current] = before }
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }

    private func remove(_ bill: BillRecord) {
        guard let index = bills.firstIndex(where: { $0.id == bill.id }) else { return }
        let removed = bills.remove(at: index)
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: ["bill-\(bill.id)"])
        Task {
            do {
                try await model.api.workerVoid("api/user-data/bills", method: "DELETE", body: APIClient.json(["id": .string(removed.id)]))
            } catch {
                bills.insert(removed, at: min(index, bills.count))
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
            }
        }
    }
}

struct AddBillSheet: View {
    @Environment(AppModel.self) private var model
    @Environment(\.dismiss) private var dismiss
    let onSaved: () async -> Void

    @State private var label = ""
    @State private var amount = ""
    @State private var due = Date()
    @State private var remind = true
    @State private var recurrence = "monthly"
    @State private var errorMessage: String?
    @State private var saving = false

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Nom ou marque (Netflix, EDF…)", text: $label)
                    TextField("Montant (€)", text: $amount).keyboardType(.decimalPad)
                    DatePicker("Échéance", selection: $due, displayedComponents: .date)
                    Picker("Récurrence", selection: $recurrence) {
                        Text("Aucune").tag("none")
                        Text("Hebdomadaire").tag("weekly")
                        Text("Mensuelle").tag("monthly")
                        Text("Annuelle").tag("yearly")
                    }
                    Toggle("Me prévenir la veille", isOn: $remind)
                }
                if let errorMessage { Text(errorMessage).font(.footnote).foregroundStyle(Theme.danger) }
            }
            .scrollContentBackground(.hidden)
            .navigationTitle("Nouvelle facture")
            .ethoneScreen()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Annuler") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Enregistrer") { save() }.disabled(saving || label.trimmingCharacters(in: .whitespaces).isEmpty || parsedAmount == nil)
                }
            }
        }
        .presentationDetents([.large])
    }

    private var parsedAmount: Double? { Double(amount.replacingOccurrences(of: ",", with: ".")) }

    private func save() {
        guard let value = parsedAmount else { return }
        saving = true
        let name = label.trimmingCharacters(in: .whitespaces)
        Task {
            do {
                let body = APIClient.json([
                    "label": .string(name),
                    "slug": .string(""),
                    "data": .object([
                        "amount": .number(value),
                        "currency": .string("€"),
                        "date": .string(DayKey.string(due)),
                        "paid": .bool(false),
                        "recurrence": .string(recurrence),
                    ]),
                ])
                let created: BillRecord = try await model.api.worker("api/user-data/bills", method: "POST", body: body)
                if remind, await NotificationManager.requestAuthorization() {
                    await NotificationManager.scheduleBill(id: created.id, label: name, amount: value, due: due)
                }
                await onSaved()
                dismiss()
            } catch {
                errorMessage = (error as? LocalizedError)?.errorDescription ?? error.localizedDescription
                saving = false
            }
        }
    }
}
