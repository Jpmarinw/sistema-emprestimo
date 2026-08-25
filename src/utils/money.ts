/**
 * Utilitários para tratamento seguro de valores monetários.
 * 
 * Regra: Operações financeiras devem ser realizadas em centavos inteiros (integers)
 * para evitar problemas de arredondamento inerentes à representação IEEE 754 (ponto flutuante).
 */

/**
 * Converte um valor monetário em reais para centavos inteiros.
 * Exemplo: 100.50 -> 10050, 10.05 -> 1005
 */
export function toCents(amount: number): number {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('Valor monetário inválido para conversão em centavos.')
  }
  return Math.round(amount * 100)
}

/**
 * Converte um valor em centavos inteiros de volta para reais.
 * Exemplo: 10050 -> 100.50
 */
export function fromCents(cents: number): number {
  if (typeof cents !== 'number' || isNaN(cents)) {
    throw new Error('Valor de centavos inválido para conversão em reais.')
  }
  return cents / 100
}

/**
 * Garante que um valor numérico tenha exatamente 2 casas decimais normalizadas.
 */
export function roundMoney(amount: number): number {
  return fromCents(toCents(amount))
}

/**
 * Formata um valor numérico para o padrão de moeda brasileiro (BRL - Real).
 * Exemplo: 1500.5 -> "R$ 1.500,50"
 */
export function formatBRL(amount: number): string {
  const safeAmount = isNaN(amount) ? 0 : amount
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount)
}

/**
 * Converte uma string no padrão pt-BR ou número para valor float monetário.
 * Aceita formatos como "1.500,50", "1500.50", "R$ 1.500,50"
 */
export function parseBRL(input: string | number): number {
  if (typeof input === 'number') {
    return roundMoney(input)
  }
  if (!input || typeof input !== 'string') {
    return 0
  }

  // Remove caracteres que não sejam dígitos, vírgula ou ponto ou sinal de menos
  const cleaned = input.replace(/[^\d.,-]/g, '').trim()
  if (!cleaned) return 0

  // Se houver vírgula, assume que a vírgula é o separador decimal brasileiro
  if (cleaned.includes(',')) {
    const withoutThousandDots = cleaned.replace(/\./g, '')
    const standardized = withoutThousandDots.replace(',', '.')
    const parsed = parseFloat(standardized)
    return isNaN(parsed) ? 0 : roundMoney(parsed)
  }

  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : roundMoney(parsed)
}
