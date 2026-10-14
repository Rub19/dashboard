import SwiftUI

enum AuthTab: String, CaseIterable, Identifiable {
    case password = "Mot de passe"
    case otp = "Code OTP"
    case register = "S'inscrire"

    var id: String { rawValue }
}

struct LoginView: View {
    @Environment(AuthStore.self) private var auth
    @State private var selectedTab: AuthTab = .password
    @State private var email = ""
    @State private var password = ""
    @State private var confirmPassword = ""
    @State private var otpCode = ""
    @State private var otpSent = false
    @State private var rememberMe = true
    @State private var isPasswordVisible = false
    @State private var isConfirmVisible = false
    @State private var infoMessage: String?
    @FocusState private var focus: Field?

    private enum Field { case email, password, confirmPassword, otpCode }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                VStack(spacing: 12) {
                    BrandMarkView(size: 60)
                        .padding(.bottom, 4)

                    Text("Bienvenue sur ETHONE")
                        .font(.system(size: 26, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)

                    Text("Connectez-vous à votre environnement numérique unifié.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 16)
                }
                .padding(.top, 32)

                GlassCard(padding: 20, cornerRadius: 24) {
                    VStack(spacing: 18) {
                        tabSelector

                        switch selectedTab {
                        case .password:
                            passwordFields
                        case .otp:
                            otpFields
                        case .register:
                            registerFields
                        }

                        if let error = auth.errorMessage {
                            Text(error)
                                .font(.footnote)
                                .foregroundStyle(Theme.danger)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }

                        if let info = infoMessage {
                            Text(info)
                                .font(.footnote)
                                .foregroundStyle(Color(hex: 0x34D399))
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }
                .overlay(alignment: .top) {
                    Capsule()
                        .fill(
                            LinearGradient(
                                colors: [Color(hex: 0xE11D48), Color(hex: 0x8B5CF6)],
                                startPoint: .leading,
                                endPoint: .trailing
                            )
                        )
                        .frame(height: 2.5)
                        .padding(.horizontal, 28)
                }

                VStack(spacing: 16) {
                    HStack(spacing: 12) {
                        Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1)
                        Text("OU CONTINUER AVEC")
                            .font(.caption2.weight(.bold))
                            .foregroundStyle(.secondary)
                        Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1)
                    }
                    .padding(.horizontal, 8)

                    HStack(spacing: 10) {
                        providerButton("Google", systemImage: "globe", provider: "google")
                        providerButton("GitHub", systemImage: "chevron.left.forwardslash.chevron.right", provider: "github")
                        providerButton("Discord", systemImage: "bubble.left.and.bubble.right.fill", provider: "discord")
                    }

                    passkeyButton
                }
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 40)
        }
        .scrollDismissesKeyboard(.interactively)
        .animation(.snappy(duration: 0.28), value: selectedTab)
        .animation(.snappy(duration: 0.28), value: otpSent)
    }

    private var tabSelector: some View {
        HStack(spacing: 4) {
            ForEach(AuthTab.allCases) { tab in
                Button {
                    selectedTab = tab
                    infoMessage = nil
                } label: {
                    VStack(spacing: 6) {
                        Text(tab.rawValue)
                            .font(.system(size: 13, weight: selectedTab == tab ? .semibold : .medium))
                            .foregroundStyle(selectedTab == tab ? Color.white : Color.secondary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)

                        Rectangle()
                            .fill(selectedTab == tab ? Color(hex: 0xE11D48) : Color.clear)
                            .frame(height: 2)
                            .cornerRadius(1)
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 4)
        .padding(.top, 2)
        .glassEffect(.regular, in: .rect(cornerRadius: 14))
    }

    private var passwordFields: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                Image(systemName: "envelope.fill")
                    .foregroundStyle(Color.secondary)
                    .frame(width: 20)
                TextField("Adresse e-mail", text: $email)
                    .textContentType(.username)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($focus, equals: .email)
                    .submitLabel(.next)
                    .onSubmit { focus = .password }
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))

            HStack(spacing: 12) {
                Image(systemName: "lock.fill")
                    .foregroundStyle(Color.secondary)
                    .frame(width: 20)
                if isPasswordVisible {
                    TextField("Mot de passe", text: $password)
                        .textContentType(.password)
                        .focused($focus, equals: .password)
                        .submitLabel(.go)
                        .onSubmit(signInPassword)
                } else {
                    SecureField("Mot de passe", text: $password)
                        .textContentType(.password)
                        .focused($focus, equals: .password)
                        .submitLabel(.go)
                        .onSubmit(signInPassword)
                }
                Button {
                    isPasswordVisible.toggle()
                } label: {
                    Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                        .foregroundStyle(Color.secondary)
                }
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))

            HStack {
                Toggle(isOn: $rememberMe) {
                    Text("Rester connecté")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
                .toggleStyle(SwitchToggleStyle(tint: Color(hex: 0xE11D48)))

                Spacer()

                Button("Mot de passe oublié ?") {
                    let address = email.trimmingCharacters(in: .whitespaces)
                    guard !address.isEmpty else {
                        infoMessage = "Saisissez d'abord votre adresse e-mail."
                        return
                    }
                    Task { infoMessage = await auth.requestPasswordReset(email: address) }
                }
                .font(.footnote)
                .foregroundStyle(Color(hex: 0xE11D48))
            }
            .padding(.horizontal, 2)

            actionButton(title: "Se connecter", icon: "arrow.right", disabled: email.isEmpty || password.isEmpty, action: signInPassword)
        }
    }

    private var otpFields: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                Image(systemName: "envelope.fill")
                    .foregroundStyle(Color.secondary)
                    .frame(width: 20)
                TextField("Adresse e-mail", text: $email)
                    .textContentType(.emailAddress)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($focus, equals: .email)
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))

            if otpSent {
                HStack(spacing: 12) {
                    Image(systemName: "key.fill")
                        .foregroundStyle(Color.secondary)
                        .frame(width: 20)
                    TextField("Code à 6 chiffres", text: $otpCode)
                        .keyboardType(.numberPad)
                        .textContentType(.oneTimeCode)
                        .font(.body.monospaced())
                        .focused($focus, equals: .otpCode)
                }
                .padding(14)
                .glassEffect(.regular, in: .rect(cornerRadius: 16))

                actionButton(title: "Vérifier le code", icon: "arrow.right", disabled: otpCode.count < 6, action: verifyOtpCode)

                Button("Renvoyer un nouveau code") {
                    Task { await sendOtp() }
                }
                .font(.footnote)
                .foregroundStyle(Color(hex: 0xE11D48))
            } else {
                actionButton(title: "Envoyer le code", icon: "paperplane.fill", disabled: email.isEmpty, action: { Task { await sendOtp() } })
            }
        }
    }

    private var registerFields: some View {
        VStack(spacing: 14) {
            HStack(spacing: 12) {
                Image(systemName: "envelope.fill")
                    .foregroundStyle(Color.secondary)
                    .frame(width: 20)
                TextField("Adresse e-mail", text: $email)
                    .textContentType(.username)
                    .keyboardType(.emailAddress)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .focused($focus, equals: .email)
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))

            HStack(spacing: 12) {
                Image(systemName: "lock.fill")
                    .foregroundStyle(Color.secondary)
                    .frame(width: 20)
                if isPasswordVisible {
                    TextField("Mot de passe (8 caractères min.)", text: $password)
                        .textContentType(.newPassword)
                        .focused($focus, equals: .password)
                } else {
                    SecureField("Mot de passe (8 caractères min.)", text: $password)
                        .textContentType(.newPassword)
                        .focused($focus, equals: .password)
                }
                Button {
                    isPasswordVisible.toggle()
                } label: {
                    Image(systemName: isPasswordVisible ? "eye.slash.fill" : "eye.fill")
                        .foregroundStyle(Color.secondary)
                }
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))

            HStack(spacing: 12) {
                Image(systemName: "lock.fill")
                    .foregroundStyle(Color.secondary)
                    .frame(width: 20)
                if isConfirmVisible {
                    TextField("Confirmer le mot de passe", text: $confirmPassword)
                        .textContentType(.newPassword)
                        .focused($focus, equals: .confirmPassword)
                } else {
                    SecureField("Confirmer le mot de passe", text: $confirmPassword)
                        .textContentType(.newPassword)
                        .focused($focus, equals: .confirmPassword)
                }
                Button {
                    isConfirmVisible.toggle()
                } label: {
                    Image(systemName: isConfirmVisible ? "eye.slash.fill" : "eye.fill")
                        .foregroundStyle(Color.secondary)
                }
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))

            let canRegister = !email.isEmpty && password.count >= 8 && password == confirmPassword
            actionButton(title: "Créer mon compte", icon: "arrow.right", disabled: !canRegister, action: registerAccount)
        }
    }

    private func actionButton(title: String, icon: String, disabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 8) {
                if auth.isBusy {
                    ProgressView().tint(.white)
                }
                Text(title)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                Image(systemName: icon)
                    .font(.footnote.weight(.bold))
                    .foregroundStyle(.white)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(
                LinearGradient(
                    colors: [Color(hex: 0xE11D48), Color(hex: 0xBE185D)],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .shadow(color: Color(hex: 0xE11D48).opacity(0.3), radius: 8, y: 3)
        }
        .disabled(disabled || auth.isBusy)
        .opacity(disabled ? 0.55 : 1.0)
    }

    private func providerButton(_ title: String, systemImage: String, provider: String) -> some View {
        Button {
            Task { await auth.signInWithOAuth(provider: provider) }
        } label: {
            HStack(spacing: 6) {
                Image(systemName: systemImage)
                    .font(.system(size: 14))
                Text(title)
                    .font(.system(size: 13, weight: .semibold))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
        }
        .buttonStyle(.glass)
        .disabled(auth.isBusy)
    }

    private var passkeyButton: some View {
        Button {
            Task { await auth.signInWithOAuth(provider: "google") }
        } label: {
            HStack(spacing: 10) {
                Image(systemName: "key.horizontal.fill")
                    .foregroundStyle(Color(hex: 0xE11D48))
                Text("Se connecter avec une clé de sécurité (Passkey)")
                    .font(.footnote.weight(.medium))
                    .foregroundStyle(.primary)
                Spacer()
                Image(systemName: "arrow.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
            .padding(14)
            .glassEffect(.regular, in: .rect(cornerRadius: 16))
        }
        .buttonStyle(.plain)
        .disabled(auth.isBusy)
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
