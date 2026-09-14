import { render, screen } from "@testing-library/react";
import PasswordStrengthMeter from "./PasswordStrengthMeter";
import { validate, required, passwordStrength } from "@/lib/form-validation";

// The bug this locks in: a password could show every visible check green
// ("Bon") in the meter while still failing the real submit-time validator,
// because the meter never displayed the symbol requirement and used a
// looser length threshold (8+ instead of 12+) than passwordStrength()
// actually enforces.
describe("PasswordStrengthMeter", () => {
  it("renders nothing for an empty password", () => {
    const { container } = render(<PasswordStrengthMeter password="" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows every requirement passwordStrength() actually checks", () => {
    render(<PasswordStrengthMeter password="x" />);
    expect(screen.getByText("12+ caractères")).not.toBeNull();
    expect(screen.getByText("1 majuscule")).not.toBeNull();
    expect(screen.getByText("1 minuscule")).not.toBeNull();
    expect(screen.getByText("1 chiffre")).not.toBeNull();
    expect(screen.getByText("1 symbole")).not.toBeNull();
  });

  it("agrees with the real validator: a password missing only a symbol is not 'Excellent'", () => {
    const password = "123456780987Az"; // 14 chars, upper, lower, digit -- no symbol
    render(<PasswordStrengthMeter password={password} />);
    expect(screen.queryByText("Excellent")).toBeNull();

    const err = validate(password, [required("required"), passwordStrength("weak")]);
    expect(err).toBe("weak");
  });

  it("agrees with the real validator: all five requirements met reads as Excellent and passes validation", () => {
    const password = "Abcdefghij1!"; // 12 chars, upper, lower, digit, symbol
    render(<PasswordStrengthMeter password={password} />);
    expect(screen.queryByText("Excellent")).not.toBeNull();

    const err = validate(password, [required("required"), passwordStrength("weak")]);
    expect(err).toBeNull();
  });
});
