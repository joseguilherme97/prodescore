export type Produtividade = {
  colaborador: string;
  pedidos: number;
  itens: number;
  erros: number;
  minutos: number;
  data: string; // "YYYY-MM-DD" (ISO)

  // (reservado p/ próximos passos — não quebra nada)
  custoErro?: number; // R$ por registro (opcional)
  tipoErro?: string; // ex: "separacao", "conferencia"...
};

export type MetaTrimestre = {
  trimestre: string; // ex: "2026T1"
  metaPontos: number;
  metaErrosMax: number;
};
