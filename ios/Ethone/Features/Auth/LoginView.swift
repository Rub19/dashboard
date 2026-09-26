import SwiftUI

struct LoginView: View {
    @Environment(AuthStore.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @FocusState private var focus: Field?

    private enum Field { case email, password }

    var body: some View {
        ScrollView {
            VStack(spacing: 28) {
                VStack(spacing: 10) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 44, weight: .semibold))
                        .foregroundStyle(Theme.accentSoft)
                        .padding(22)
                        .glassEffect(Glass.regular.tint(Theme.accent.opacity(0.35)), in: .circle)
                    Text("ETHONE").font(.system(size: 34, weight: .bold, design: .rounded))
                    Text("Votre espace, partout.").foregroundStyle(.secondary)
                }
                .padding(.top, 48)

                GlassCard(padding: 20) {
                    VStack(spacing: 14) {
                        TextField("E-mail", text: $email)
                            .textContentType(.username)
                            .keyboardType(.emailAddress)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .focused($focus, equals: .email)
                            .submitLabel(.next)
                            .onSubmit { focus = .password }
                            .padding(14)
                            .glassEffect(.regular, in: .rect(cornerRadius: 16))

                        SecureField("Mot de passe", text: $password)
                            .textContentType(.password)
                            .focused($focus, equals: .password)
                            .submitLabel(.go)
                            .onSubmit(signIn)
                            .padding(14)
                            .glassEffect(.regular, in: .rect(cornerRadius: 16))

                        if let message = auth.errorMessage {
                            Text(message)
                                .font(.footnote)
                                .foregroundStyle(Theme.danger)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        Button(action: signIn) {
                            HStack {
                                if auth.isBusy { ProgressView() }
                                Text("Se connecter").fontWeight(.semibold)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 6)
                        }
                        .buttonStyle(.glassProminent)
                        .disabled(auth.isBusy || email.isEmpty || password.isEmpty)
                    }
                }

                VStack(spacing: 12) {
                    Text("ou continuer avec").font(.footnote).foregroundStyle(.secondary)
                    GlassEffectContainer(spacing: 12) {
                        HStack(spacing: 12) {
                            providerButton("Discord", systemImage: "bubble.left.and.bubble.right.fill", provider: "discord")
                            providerButton("Google", systemImage: "globe", provider: "google")
                        }
                    }
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
        .scrollDismissesKeyboard(.interactively)
    }

    private func providerButton(_ title: String, systemImage: String, provider: String) -> some View {
        Button {
            Task { await auth.signInWithOAuth(provider: provider) }
        } label: {
            Label(title, systemImage: systemImage)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 6)
        }
        .buttonStyle(.glass)
        .disabled(auth.isBusy)
    }

    private func signIn() {
        guard !email.isEmpty, !password.isEmpty else { return }
        focus = nil
        Task { await auth.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password) }
    }
}

/// Second facteur (TOTP ou code de secours) demandé par le Worker après la connexion.
struct MFAView: View {
    @Environment(AuthStore.self) private var auth
    @State private var code = ""
    @State private var useBackup = false

    var body: some View {
        VStack(spacing: 24) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 44))
                .foregroundStyle(Theme.accentSoft)
                .padding(22)
                .glassEffect(Glass.regular.tint(Theme.accent.opacity(0.3)), in: .circle)
            Text("Vérification en deux étapes").font(.title2.bold())
            Text(useBackup ? "Saisissez un code de secours." : "Saisissez le code à 6 chiffres de votre application d'authentification.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)

            GlassCard(padding: 18) {
                VStack(spacing: 14) {
                    TextField(useBackup ? "Code de secours" : "000000", text: $code)
                        .keyboardType(useBackup ? .asciiCapable : .numberPad)
                        .textContentType(.oneTimeCode)
                        .font(.title2.monospaced())
                        .multilineTextAlignment(.center)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)

                    if let message = auth.errorMessage {
                        Text(message).font(.footnote).foregroundStyle(Theme.danger)
                    }

                    Button {
                        Task {
                            if useBackup { await auth.verifyMFA(backupCode: code) } else { await auth.verifyMFA(code: code) }
                        }
                    } label: {
                        HStack {
                            if auth.isBusy { ProgressView() }
                            Text("Valider").fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 6)
                    }
                    .buttonStyle(.glassProminent)
                    .disabled(auth.isBusy || code.isEmpty)
                }
            }

            Button(useBackup ? "Utiliser mon application" : "Utiliser un code de secours") {
                useBackup.toggle()
                code = ""
            }
            .font(.footnote)

            Button("Se déconnecter", role: .destructive) { Task { await auth.signOut() } }
                .font(.footnote)
        }
        .padding(24)
    }
}
