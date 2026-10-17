import SwiftUI

enum AuthTab: String, CaseIterable, Identifiable {
    case password = "Mot de passe"
    case otp = "Code e-mail"
    case register = "Créer un compte"

    var id: String { rawValue }
}

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
                    SecureField(LocalizedStringKey(placeholder), text: $text)
                } else {
                    TextField(LocalizedStringKey(placeholder), text: $text)
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
    @State private var showEmail = false
    @FocusState private var focus: Field?

    private enum Field { case email, password, confirmPassword, otpCode }

    var body: some View {
        ZStack {
            LoginBackdrop()
            ScrollView {
                VStack(spacing: 30) {
                    header
                    providers.reveal(3)
                    emailSection.reveal(4)
                }
                .padding(.horizontal, 24)
                .padding(.top, 56)
                .padding(.bottom, 40)
                .frame(maxWidth: 480)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
        }
        .sensoryFeedback(.selection, trigger: selectedTab)
        .sensoryFeedback(.impact(weight: .light), trigger: showEmail)
        .sensoryFeedback(.error, trigger: auth.errorMessage) { _, new in new != nil }
        .animation(Motion.snap, value: selectedTab)
        .animation(Motion.snap, value: otpSent)
        .animation(Motion.swap, value: auth.errorMessage)
    }

    private var header: some View {
        VStack(spacing: 22) {
            BreathingMark()
                .reveal(0)
            VStack(spacing: 14) {
                EthoneHeadline(first: "Votre espace,", second: "réinventé pour vous.", alignment: .center)
            }
            .reveal(1)
            Text("Notes, tâches, mails, calendrier et IA, synchronisés en direct avec votre ordinateur.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)
                .reveal(2)
        }
    }

    @ViewBuilder
    private var emailSection: some View {
        if showEmail {
            authCard
                .transition(.asymmetric(insertion: .scale(scale: 0.94, anchor: .top).combined(with: .opacity), removal: .opacity))
        } else {
            Button {
                withAnimation(Motion.snap) { showEmail = true }
                focus = .email
            } label: {
                Label("Continuer avec un e-mail", systemImage: "envelope.fill")
                    .font(.body.weight(.semibold))
                    .frame(maxWidth: .infinity, minHeight: 36)
            }
            .buttonStyle(.glass)
            .transition(.opacity)
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
                        Text(LocalizedStringKey(tab.rawValue))
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
        VStack(spacing: 12) {
            providerButton("Discord", logo: "BrandDiscord", provider: "discord", background: Color(hex: 0x5865F2), foreground: .white)
            providerButton("Google", logo: "BrandGoogle", provider: "google", background: .white, foreground: Color(hex: 0x1F1F1F))
            providerButton("GitHub", logo: "BrandGitHub", provider: "github", background: Color(hex: 0x24292F), foreground: .white)
        }
    }

    private func providerButton(_ title: String, logo: String, provider: String, background: Color, foreground: Color) -> some View {
        Button {
            Task { await auth.signInWithOAuth(provider: provider) }
        } label: {
            HStack(spacing: 12) {
                Image(logo)
                    .resizable()
                    .renderingMode(provider == "google" ? .original : .template)
                    .scaledToFit()
                    .frame(width: 20, height: 20)
                Text(LocalizedStringKey("Continuer avec " + title))
                    .font(.body.weight(.semibold))
            }
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity, minHeight: 52)
            .background(background, in: .capsule)
            .overlay(Capsule().strokeBorder(.white.opacity(0.12)))
            .contentShape(.capsule)
        }
        .buttonStyle(PressScaleStyle())
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

/// Press feedback: a quick spring shrink while the finger is down.
private struct PressScaleStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.97 : 1)
            .opacity(configuration.isPressed ? 0.9 : 1)
            .animation(.spring(response: 0.25, dampingFraction: 0.7), value: configuration.isPressed)
    }
}

/// The ETHONE mark over a slowly breathing accent halo.
private struct BreathingMark: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var breathe = false

    var body: some View {
        ZStack {
            Circle()
                .fill(RadialGradient(colors: [Theme.accent.opacity(0.55), .clear], center: .center, startRadius: 4, endRadius: 80))
                .frame(width: 170, height: 170)
                .scaleEffect(breathe ? 1.08 : 0.92)
                .opacity(breathe ? 1 : 0.7)
            BrandMarkView(size: 76)
                .shadow(color: Theme.accent.opacity(0.45), radius: 18, y: 6)
        }
        .frame(height: 130)
        .onAppear {
            guard !reduceMotion else { return }
            withAnimation(.easeInOut(duration: 3.2).repeatForever(autoreverses: true)) { breathe = true }
        }
        .accessibilityHidden(true)
    }
}

/// Auth backdrop mirroring the website: diffuse pools of accent light that drift slowly, and a few rising specks.
private struct LoginBackdrop: View {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    private static let specks: [(x: Double, y: Double, size: Double, speed: Double)] = [
        (0.12, 0.7, 2, 0.011), (0.24, 0.3, 1.5, 0.008), (0.37, 0.85, 1.5, 0.013), (0.55, 0.2, 2, 0.009),
        (0.66, 0.6, 1.5, 0.012), (0.78, 0.3, 1.5, 0.010), (0.88, 0.75, 2, 0.014), (0.46, 0.5, 1.5, 0.007),
        (0.06, 0.25, 1.5, 0.010), (0.31, 0.95, 2, 0.012), (0.72, 0.12, 1.5, 0.009), (0.94, 0.46, 1.5, 0.011),
    ]

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: reduceMotion)) { context in
            let t = reduceMotion ? 0 : context.date.timeIntervalSinceReferenceDate
            Canvas { canvas, size in
                let accent = Theme.accent
                let pools: [(x: Double, y: Double, r: Double, color: Color, phase: Double)] = [
                    (0.5, 0.12, 0.75, accent.opacity(0.32), 0),
                    (0.82, 0.45, 0.55, accent.opacity(0.2), 2.1),
                    (0.18, 0.7, 0.6, Color(hex: 0x38BDF8).opacity(0.12), 4.2),
                ]
                for pool in pools {
                    let cx = size.width * (pool.x + 0.06 * sin(t / 7 + pool.phase))
                    let cy = size.height * (pool.y + 0.04 * cos(t / 9 + pool.phase))
                    let r = size.width * pool.r
                    canvas.fill(
                        Path(ellipseIn: CGRect(x: cx - r, y: cy - r, width: r * 2, height: r * 2)),
                        with: .radialGradient(Gradient(colors: [pool.color, .clear]), center: CGPoint(x: cx, y: cy), startRadius: 0, endRadius: r)
                    )
                }
                for speck in Self.specks {
                    let progress = (speck.y - t * speck.speed).truncatingRemainder(dividingBy: 1)
                    let y = (progress < 0 ? progress + 1 : progress) * size.height
                    let x = size.width * speck.x + 6 * sin(t / 3 + speck.x * 10)
                    canvas.fill(Path(ellipseIn: CGRect(x: x, y: y, width: speck.size, height: speck.size)), with: .color(.white.opacity(0.22)))
                }
            }
        }
        .ignoresSafeArea()
        .allowsHitTesting(false)
        .accessibilityHidden(true)
    }
}

struct MFAView: View {
    @Environment(AuthStore.self) private var auth
    @State private var code = ""
    @State private var useBackup = false

    var body: some View {
        VStack(alignment: .leading, spacing: 22) {
            Image(systemName: "lock.shield.fill")
                .font(.system(size: 28))
                .foregroundStyle(Theme.accent)
                .padding(16)
                .glassEffect(Glass.regular.tint(Theme.accent.opacity(0.3)), in: .rect(cornerRadius: 20))
                .reveal(0)
            VStack(alignment: .leading, spacing: 12) {
                AccentRule()
                EthoneHeadline(first: "Une dernière étape,", second: "votre code de sécurité.", size: .title)
            }
            .reveal(1)
            Text(useBackup ? "Saisissez un code de secours." : "Saisissez le code à 6 chiffres de votre application d'authentification.")
                .foregroundStyle(.secondary)
                .contentTransition(.opacity)
                .reveal(2)

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

            HStack {
                Button(useBackup ? "Utiliser mon application" : "Utiliser un code de secours") {
                    withAnimation(Motion.snap) {
                        useBackup.toggle()
                        code = ""
                    }
                }
                Spacer()
                Button("Se déconnecter", role: .destructive) { Task { await auth.signOut() } }
            }
            .font(.footnote.weight(.medium))
        }
        .padding(24)
        .frame(maxWidth: 520, maxHeight: .infinity, alignment: .top)
        .padding(.top, 20)
        .sensoryFeedback(.error, trigger: auth.errorMessage) { _, new in new != nil }
    }
}
