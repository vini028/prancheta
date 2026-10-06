// src/money.rs
//
// Utilidades de aritmética monetária (AC03).
//
// Todo valor monetário trafega como `NUMERIC(10,2)` no Postgres e como
// `BigDecimal` no Rust. Para que descontos, subtotais e o preço de venda
// padrão sejam determinísticos (e idênticos ao `ROUND(x, 2)` do Postgres),
// todo resultado intermediário passa por `arredondar_2`, que aplica
// "metade para longe do zero" com 2 casas decimais.

use bigdecimal::BigDecimal;
use rust_decimal::RoundingStrategy;
use std::str::FromStr;

/// Arredonda para 2 casas decimais (metade para longe do zero).
pub fn arredondar_2(valor: &BigDecimal) -> BigDecimal {
    let dec = rust_decimal::Decimal::from_str(&valor.to_string())
        .unwrap_or(rust_decimal::Decimal::ZERO);
    let arredondado = dec.round_dp_with_strategy(2, RoundingStrategy::MidpointAwayFromZero);
    BigDecimal::from_str(&arredondado.to_string()).unwrap_or_else(|_| BigDecimal::from(0))
}

/// `base * pct` arredondado para 2 casas (ex.: base * 0.05 = desconto de 5%).
pub fn percentual(base: &BigDecimal, pct: &BigDecimal) -> BigDecimal {
    arredondar_2(&(base * pct))
}

/// Zero monetário com 2 casas ("0.00"), para JSON consistente com os
/// demais valores (`BigDecimal::zero()` serializaria como "0").
pub fn zero2() -> BigDecimal {
    BigDecimal::from_str("0.00").expect("constante decimal válida")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn bd(s: &str) -> BigDecimal {
        BigDecimal::from_str(s).unwrap()
    }

    #[test]
    fn arredonda_metade_para_longe_do_zero() {
        assert_eq!(arredondar_2(&bd("2.345")), bd("2.35"));
        assert_eq!(arredondar_2(&bd("2.335")), bd("2.34"));
        assert_eq!(arredondar_2(&bd("10.00")), bd("10.00"));
    }

    #[test]
    fn percentual_de_5_sobre_199_99() {
        // 199.99 * 0.05 = 9.9995 -> 10.00
        assert_eq!(percentual(&bd("199.99"), &bd("0.05")), bd("10.00"));
    }

    #[test]
    fn preco_venda_padrao_30_pct() {
        // 10.00 * 1.30 = 13.00
        let taxa = bd("1.30");
        assert_eq!(arredondar_2(&(&bd("10.00") * &taxa)), bd("13.00"));
    }
}
