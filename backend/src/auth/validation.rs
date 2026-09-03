use regex::Regex;

/// Valida a força da senha: mínimo 8 caracteres, com maiúscula, minúscula e número.
pub fn validate_password(password: &str) -> bool {
    if password.len() < 8 {
        return false;
    }
    let mut has_upper = false;
    let mut has_lower = false;
    let mut has_digit = false;
    for ch in password.chars() {
        if ch.is_uppercase() { has_upper = true; }
        if ch.is_lowercase() { has_lower = true; }
        if ch.is_digit(10) { has_digit = true; }
    }
    has_upper && has_lower && has_digit
}

/// Valida o formato do e-mail.
pub fn validate_email(email_user: &str) -> bool {
    let re = Regex::new(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$").unwrap();
    re.is_match(email_user)
}