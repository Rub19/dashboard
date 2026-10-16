import SwiftUI

enum AuthTab: String, CaseIterable, Identifiable {
    case password = "Mot de passe"
    case otp = "Code e-mail"
    case register = "Créer un compte"

    var id: String { rawValue }
}

private struct LoginModule: Identifiable {
    let title: String
    let icon: String
    var id: String { title }
}

private let loginModules = [
    LoginModule(title: "Notes", icon: "note.text"),
    LoginModule(title: "Tâches", icon: "checklist"),
    LoginModule(title: "Calendrier", icon: "calendar"),
    LoginModule(title: "Finances", icon: "eurosign"),
    LoginModule(title: "Musique", icon: "music.note"),
    LoginModule(title: "IA locale", icon: "sparkles"),
]

/// Text or secure field in an ETHONE glass well, with an optional reveal toggle.
private struct AuthField: View {
    let placeholder: String
    let icon: String
    @Binding var text: String
    var secure = false
    var content: UITextContentType? = nil
    var keyboard: UIKeyboardType = .default
    var monospaced = false
    @State private var revealed = false

    var body: some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.secondary)
                .frame(width: 22)
                .accessibilityHidden(true)
            Group {
                if secure && !revealed {
                    SecureField(placeholder, text: $text)
                } else {
                    TextField(placeholder, text: $text)
                        .keyboardType(keyboard)
                }
            }
            .textContentType(content)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .font(monospaced ? .body.monospaced() : .body)
            if secure {
                Button {
                    revealed.toggle()
                } label: {
                    Image(systemName: revealed ? "eye.slash" : "eye")
                        .contentTransition(.symbolEffect(.replace))
                        .foregroundStyle(.secondary)
                }
                .buttonStyle(.plain)
                .accessibilityLabel(revealed ? "Masquer le mot de passe" : "Afficher le mot de passe")
            }
        }
        .padding(.horizontal, 16)
        .frame(minHeight: 52)
        .glassEffect(.regular, in: .rect(cornerRadius: 16))
    }
}

struct LoginView: View {
    @Environment(AuthStore.self) private var auth
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Namespace private var tabNamespace
    @State private var selectedTab: AuthTab = .password
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var otpCode = ""
    @State private var otpSent = false
    @State private var infoMessage: String?
    @FocusState private var focus: Field?

    private enum Field { case email, password, confirmPassword, otpCode }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                hero
                authCard.reveal(4)
                providers.reveal(5)
            }
            .padding(.horizontal, 22)
            .padding(.top, 28)
            .padding(.bottom, 40)
            .frame(maxWidth: 520)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .sensoryFeedback(.selection, trigger: selectedTab)
        .sensoryFeedback(.error, trigger: auth.errorMessage) { _, new in new != nil }
        .animation(Motion.snap, value: selectedTab)
        .animation(Motion.snap, value: otpSent)
        .animation(Motion.swap, value: auth.errorMessage)
    }

    private var hero: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(spacing: 10) {
                BrandMarkView(size: 34)
                Text("ETHONE")
                    .font(.headline.weight(.semibold))
                    .tracking(0.6)
            }
            .reveal(0)

            VStack(alignment: .leading, spacing: 14) {
                AccentRule()
                EthoneHeadline(first: "Votre espace,", second: "réinventé pour vous.")
            }
            .reveal(1)

            Text("Notes, tâches, calendrier, finances, musique et IA locale réunis, synchronisés en direct avec votre ordinateur.")
                .font(.body)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
                .reveal(2)

            LazyVGrid(columns: [GridItem(.flexible(), alignment: .leading), GridItem(.flexible(), alignment: .leading), GridItem(.flexible(), alignment: .leading)], alignment: .leading, spacing: 12) {
                ForEach(loginModules) { module in
                    HStack(spacing: 8) {
                        Image(systemName: module.icon)
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 28, height: 28)
                            .background(.primary.opacity(0.05), in: .rect(cornerRadius: 8, style: .continuous))
                            .overlay(RoundedRectangle(cornerRadius: 8, style: .continuous).strokeBorder(.primary.opacity(0.08)))
                        Text(module.title)
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(.primary.opacity(0.82))
                            .lineLimit(1)
                            .minimumScaleFactor(0.85)
                    }
                    .accessibilityElement(children: .combine)
                }
            }
            .padding(.top, 4)
            .overlay(alignment: .top) {
                Rectangle()
                    .fill(LinearGradient(colors: [.primary.opacity(0.1), .clear], startPoint: .leading, endPoint: .trailing))
                    .frame(height: 1)
                    .offset(y: -12)
            }
            .reveal(3)
        }
    }

    private var authCard: some View {
        VStack(alignment: .leading, spacing: 18) {
            tabSelector

            Group {
                switch selectedTab {
                case .password: passwordFields
                case .otp: otpFields
                case .register: registerFields
                }
            }
            .transition(.asymmetric(insertion: .opacity.combined(with: .offset(y: 8)), removal: .opacity))
            .id(selectedTab)

            if let error = auth.errorMessage {
                Label(error, systemImage: "exclamationmark.circle.fill")
                    .font(.footnote)
                    .foregroundStyle(Theme.danger)
                    .transition(.opacity.combined(with: .offset(y: -4)))
            }
            if let info = infoMessage {
                Label(info, systemImage: "checkmark.circle.fill")
                    .font(.footnote)
                    .foregroundStyle(Theme.success)
                    .transition(.opacity.combined(with: .offset(y: -4)))
            }
        }
        .padding(20)
        .glassEffect(.regular, in: .rect(cornerRadius: 28))
    }

    private var tabSelector: some View {
        GlassEffectContainer(spacing: 0) {
            HStack(spacing: 0) {
                ForEach(AuthTab.allCases) { tab in
                    Button {
                        selectedTab = tab
                        infoMessage = nil
                    } label: {
                        Text(tab.rawValue)
                            .font(.subheadline.weight(selectedTab == tab ? .semibold : .medium))
                            .foregroundStyle(selectedTab == tab ? .primary : .secondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.8)
                            .frame(maxWidth: .infinity, minHeight: 38)
                            .background {
                                if selectedTab == tab {
                                    Capsule()
                                        .fill(Theme.accent.opacity(0.22))
                                        .matchedGeometryEffect(id: "tab", in: tabNamespace)
                                }
                            }
                            .contentShape(.capsule)
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(selectedTab == tab ? .isSelected : [])
                }
            }
            .padding(4)
            .glassEffect(.regular, in: .capsule)
        }
    }

    private var emailField: some View {
        AuthField(placeholder: "Adresse e-mail", icon: "envelope", text: $email, content: .username, keyboard: .emailAddress)
            .focused($focus, equals: .email)
            .submitLabel(.next)
    }

    private var passwordFields: some View {
        VStack(spacing: 12) {
            emailField.onSubmit { focus = .password }
            AuthField(placeholder: "Mot de passe", icon: "lock", text: $password, secure: true, content: .password)
                .focused($focus, equals: .password)
                .submitLabel(.go)
                .onSubmit(signInPassword)
            HStack {
                Spacer()
                Button("Mot de passe oublié ?") {
                    let address = email.trimmingCharacters(in: .whitespaces)
                    guard !address.isEmpty else {
                        infoMessage = "Saisissez d'abord votre adresse e-mail."
                        return
                    }
                    Task { infoMessage = await auth.requestPasswordReset(email: address) }
                }
                .font(.footnote.weight(.medium))
                .tint(Theme.accent)
            }
            primaryButton("Se connecter", disabled: email.isEmpty || password.isEmpty, action: signInPassword)
        }
    }

    private var otpFields: some View {
        VStack(spacing: 12) {
            emailField.onSubmit { Task { await sendOtp() } }
            if otpSent {
                AuthField(placeholder: "Code à 6 chiffres", icon: "number", text: $otpCode, content: .oneTimeCode, keyboard: .numberPad, monospaced: true)
                    .focused($focus, equals: .otpCode)
                    .transition(.opacity.combined(with: .offset(y: 8)))
                primaryButton("Vérifier le code", disabled: otpCode.count < 6, action: verifyOtpCode)
                Button("Renvoyer un code") { Task { await sendOtp() } }
                    .font(.footnote.weight(.medium))
                    .tint(Theme.accent)
                    .frame(maxWidth: .infinity)
            } else {
                primaryButton("Recevoir un code par e-mail", disabled: email.isEmpty) { Task { await sendOtp() } }
            }
        }
    }

    private var registerFields: some View {
        VStack(spacing: 12) {
            emailField.onSubmit { focus = .password }
            AuthField(placeholder: "Mot de passe (8 caractères min.)", icon: "lock", text: $password, secure: true, content: .newPassword)
                .focused($focus, equals: .password)
                .submitLabel(.next)
                .onSubmit { focus = .confirmPassword }
            AuthField(placeholder: "Confirmer le mot de passe", icon: "lock.rotation", text: $confirmPassword, secure: true, content: .newPassword)
                .focused($focus, equals: .confirmPassword)
                .submitLabel(.go)
                .onSubmit(registerAccount)
            if !confirmPassword.isEmpty && confirmPassword != password {
                Text("Les deux mots de passe ne correspondent pas.")
                    .font(.footnote)
                    .foregroundStyle(Theme.warning)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            primaryButton("Créer mon compte", disabled: email.isEmpty || password.count < 8 || password != confirmPassword, action: registerAccount)
        }
    }

    private func primaryButton(_ title: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if auth.isBusy {
                    ProgressView().tint(.white)
                }
                Text(title).fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity, minHeight: 34)
        }
        .buttonStyle(.glassProminent)
        .tint(Theme.accent)
        .disabled(disabled || auth.isBusy)
    }

    private var providers: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                Rectangle().fill(.primary.opacity(0.1)).frame(height: 1)
                Text("ou continuer avec")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .fixedSize()
                Rectangle().fill(.primary.opacity(0.1)).frame(height: 1)
            }
            GlassEffectContainer(spacing: 10) {
                HStack(spacing: 10) {
                    providerButton("Google", provider: "google")
                    providerButton("GitHub", provider: "github")
                    providerButton("Discord", provider: "discord")
                }
            }
        }
    }

    private func providerButton(_ title: String, provider: String) -> some View {
        Button {
            Task { await auth.signInWithOAuth(provider: provider) }
        } label: {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity, minHeight: 30)
        }
        .buttonStyle(.glass)
        .disabled(auth.isBusy)
        .accessibilityLabel("Continuer avec \(title)")
    }

    private func signInPassword() {
        guard !email.isEmpty, !password.isEmpty else { return }
        focus = nil
        Task { await auth.signIn(email: email.trimmingCharacters(in: .whitespaces), password: password) }
    }

    private func sendOtp() async {
        let address = email.trimmingCharacters(in: .whitespaces)
        guard !address.isEmpty else { return }
        focus = nil
        infoMessage = await auth.signInWithOtp(email: address)
        otpSent = true
        focus = .otpCode
    }

    private func verifyOtpCode() {
        let code = otpCode.trimmingCharacters(in: .whitespaces)
        guard !code.isEmpty else { return }
        focus = nil
        Task { await auth.verifyOtp(email: email.trimmingCharacters(in: .whitespaces), token: code) }
    }

    private func registerAccount() {
        guard !email.isEmpty, password.count >= 8, password == confirmPassword else { return }
        focus = nil
        Task { await auth.signUp(email: email.trimmingCharacters(in: .whitespaces), password: password) }
    }
}

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
            Text("Vérification en deux étapes").font(.title2.weight(.semibold))
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
                        .padding(14)
                        .glassEffect(.regular, in: .rect(cornerRadius: 16))

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
