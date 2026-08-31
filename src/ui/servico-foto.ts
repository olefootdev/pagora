// =====================================================================
// PAGORA — As fotos dos serviços
// =====================================================================
// Renders 3D da frota com a marca aplicada, um por necessidade. Entraram no
// lugar das silhuetas vetoriais na home: a silhueta diz "categoria", a foto
// diz "é este caminhão que vai chegar na sua obra".
//
// Sobre o arquivo: o original é PNG de 958×649 e ~570 kB cada — 3,3 MB para
// as seis, o que é inaceitável na primeira tela do app. Aqui elas estão
// recortadas em 2:1 (o recorte também tira o verde morto de cima e de baixo,
// então o veículo ocupa mais quadro) e salvas em JPEG progressivo 670×335.
// **218 kB no total, 94% a menos.**
//
// O fundo das seis NÃO era o mesmo verde: media de #118A6B a #1A8F72, e
// empilhadas numa coluna dava para ver que não batiam. Todas foram levadas
// para #159173, a média — por deslocamento linear da imagem inteira, não
// repintando só o fundo. Deslocar tudo evita halo na borda do veículo e
// mantém a sombra coerente; o caminhão é verde da marca, então acompanhar o
// ajuste é o certo. O `--x-fleet-bg` do CSS usa este mesmo valor.
//
// JPEG e não WebP porque o `sips` do macOS lê WebP mas não escreve. Não custa
// transparência: o fundo é chapado. Se um dia entrar uma etapa de build com
// `cwebp`, dá para trocar sem tocar em quem consome este módulo.
//
// O Vite versiona o nome no build, então trocar uma foto invalida o cache
// dela sozinho.
// =====================================================================

import cacamba from '../assets/servicos/pagora-cacamba.jpg';
import mudanca from '../assets/servicos/pagora-mudanca.jpg';
import frete from '../assets/servicos/pagora-frete.jpg';
import material from '../assets/servicos/pagora-material.jpg';
import guincho from '../assets/servicos/pagora-guincho.jpg';
import maquina from '../assets/servicos/pagora-maquina.jpg';

/** Chaveado pelos `NeedKind` do domínio de intenção, igual ao `FLEET_ART`. */
export const SERVICO_FOTO: Record<string, string> = {
  entulho: cacamba,
  mudanca: mudanca,
  carga: frete,
  material: material,
  veiculo: guincho,
  maquina: maquina,
};

/**
 * A proporção do recorte. A CSS usa este mesmo número para reservar a altura
 * antes de a imagem chegar — sem isso a lista pula quando cada foto carrega.
 */
export const FOTO_RATIO = '2 / 1';
