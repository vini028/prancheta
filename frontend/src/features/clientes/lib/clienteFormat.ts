export const onlyDigits = (value: string) => value.replace(/\D/g, '');

export const formatCpf = (cpf: string) => {
  const d = onlyDigits(cpf);
  return d.length === 11 ? d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : cpf;
};
