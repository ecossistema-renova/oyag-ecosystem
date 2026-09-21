/* OYAG Ecosystem · Module Registry v1.0
   Fonte única de verdade para navegação entre módulos públicos.
   Links entre módulos devem usar publicUrl; rotas internas permanecem dentro do módulo.
*/
window.OYAG_MODULES = Object.freeze({
  academy:    { key:'academy',    label:'OYAG Academy',    publicUrl:'https://academy.cledemilsonoliveira.com/',    internalBase:'/academy/' },
  app:        { key:'app',        label:'OYAG Ecosystem',  publicUrl:'https://app.cledemilsonoliveira.com/',        internalBase:'/desktop/' },
  conteudos:  { key:'conteudos',  label:'Conteúdos',       publicUrl:'https://conteudos.cledemilsonoliveira.com/',  internalBase:'https://cledemilsonoliveira.com/conteudos/' },
  ia:         { key:'ia',         label:'OYAG IA',         publicUrl:'https://ia.cledemilsonoliveira.com/',         internalBase:'/ia/' },
  food:       { key:'food',       label:'OYAG Food',       publicUrl:'https://food.cledemilsonoliveira.com/',       internalBase:'/food/' },
  comunidade: { key:'comunidade', label:'OYAG Community',  publicUrl:'https://comunidade.cledemilsonoliveira.com/', internalBase:'/community.html' },
  agenda:     { key:'agenda',     label:'OYAG Agenda',     publicUrl:'https://agenda.cledemilsonoliveira.com/',     internalBase:'/agenda/' },
  finance:    { key:'finance',    label:'OYAG Finance',    publicUrl:'https://finance.cledemilsonoliveira.com/',    internalBase:'/finance/' },
  marketplace:{ key:'marketplace',label:'OYAG Marketplace',publicUrl:'https://marketplace.cledemilsonoliveira.com/',internalBase:'/marketplace.html' },
  parcerias:  { key:'parcerias',  label:'Parcerias',       publicUrl:'https://parcerias.cledemilsonoliveira.com/',  internalBase:'https://cledemilsonoliveira.com/parcerias/' },
  site:       { key:'site',       label:'Site oficial',    publicUrl:'https://cledemilsonoliveira.com/',            internalBase:'https://cledemilsonoliveira.com/' }
});
window.OYAG_MODULE_URL = function(key){
  return window.OYAG_MODULES?.[key]?.publicUrl || '#';
};
