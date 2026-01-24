/**
 * Helper para gerar HTML do PDF de motor
 * Baseado no padrão usado pelo app em src/templates/pdfTemplates.ts
 */

/**
 * Cores padrão para os PDFs (mesmo padrão do app)
 */
const PDF_COLORS = {
  primary: "#003366",
  secondary: "#004080",
  accent: "#b91c1c",
  text: "#1f2937",
  textLight: "#6b7280",
  border: "#e5e7eb",
  bgLight: "#f9fafb",
  white: "#ffffff",
};

/**
 * Formata valor para exibição (retorna "-" se vazio)
 */
function formatValue(value) {
  return value || "-";
}

function getSectionIconSVG(name) {
  const common = 'width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#0b1220" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';

  switch (name) {
    case 'clipboard':
      return `<svg ${common}><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/></svg>`;
    case 'box':
      return `<svg ${common}><path d="M21 16V8a2 2 0 0 0-1-1.73L13 2.27a2 2 0 0 0-2 0L4 6.27A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7.2 12 12l8.7-4.8"/><path d="M12 22V12"/></svg>`;
    case 'bolt':
      return `<svg ${common}><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/></svg>`;
    case 'pencil':
      return `<svg ${common}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
    case 'tag':
      return `<svg ${common}><path d="M20.59 13.41 11 3H4v7l9.59 9.59a2 2 0 0 0 2.82 0l4.18-4.18a2 2 0 0 0 0-2.82z"/><path d="M7 7h.01"/></svg>`;
    case 'camera':
      return `<svg ${common}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;
    case 'plug':
      return `<svg ${common}><path d="M9 2v6"/><path d="M15 2v6"/><path d="M12 17v5"/><path d="M7 8h10"/><path d="M9 8v5a3 3 0 0 0 6 0V8"/></svg>`;
    default:
      return '';
  }
}

/**
 * Estilos CSS para o Header (mesmo padrão do app)
 */
function getHeaderStyles() {
  return `
    /* HEADER */
    .header {
      background-color: ${PDF_COLORS.primary};
      color: white;
      padding: 0px;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    .company-info {
      flex: 1;
      padding: 10px 0px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
    }
    .company-name {
      font-size: 18px;
      font-weight: 700;
      text-transform: uppercase;
      margin: 0;
      line-height: 1.2;
    }
    .document-title {
      font-size: 16px;
      font-weight: 500;
      text-transform: uppercase;
      margin: 8px 0 0 0;
      line-height: 1.2;
      opacity: 0.95;
    }
    .company-details {
      font-size: 10px;
      opacity: 0.9;
      margin-top: 5px;
      line-height: 1.4;
    }
    .logo-container {
      position: absolute;
      right: 0px;
      top: 0px;
      bottom: 0px;
      margin: 0px;
      padding: 0px;
      height: 100%;
      min-width: 180px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      flex-shrink: 0;
    }
    .logo-img {
      height: auto;
      max-height: 100%;
      width: auto;
      max-width: 180px;
      object-fit: contain;
      display: block;
      margin: 0px;
      padding: 0px;
    }
  `;
}

/**
 * Gera HTML do cabeçalho do PDF (mesmo padrão do app)
 */
function getPDFHeaderHTML(empresa, tituloDocumento, logoBase64, mostrarLogo = true) {
  return `
    <!-- HEADER -->
    <div class="header">
      <div class="company-info">
        <h1 class="company-name">${empresa.nomeFantasia || empresa.nome || ''}</h1>
        ${tituloDocumento ? `<h2 class="document-title">${tituloDocumento}</h2>` : ''}
      </div>
      ${empresa.logo && mostrarLogo && logoBase64
        ? `<div class="logo-container"><img src="${logoBase64}" class="logo-img" /></div>`
        : ''
      }
    </div>
  `;
}

/**
 * Gera HTML do rodapé do PDF (mesmo padrão do app)
 */
function getPDFFooter(empresa, mostrarLogo = false, logoBase64 = null, motor = null) {
  const telefones = empresa.telefone ? [empresa.telefone] : [];
  const enderecoCompleto = `${empresa.endereco || ''}, Nº ${empresa.numero || ''} - B. ${empresa.bairro || ''} - ${empresa.cidade || ''} - CEP: ${empresa.cep || ''}`;
  const data = new Date();

  return `
    <div class="footer-wrapper">
      <div class="footer">
        ${empresa.logo && mostrarLogo && logoBase64
          ? `<div class="footer-logo-section"><div class="footer-logo-container"><img src="${logoBase64}" class="footer-logo-img" /></div></div>`
          : ''
        }
        <div class="footer-content">
          <strong>${(empresa.nomeFantasia || '').toUpperCase()}</strong> - ${empresa.nome || ''}<br/>
          CNPJ: ${empresa.cnpj || ''}<br/>
          ${enderecoCompleto}<br/>
          E-mail: ${empresa.email || ''}<br/>
          Telefone(s): ${telefones.join(', ')}<br/>
          Este documento foi gerado eletronicamente em ${data.toLocaleDateString('pt-BR')} e possui validade legal.
        </div>
      </div>
    </div>
  `;
}

/**
 * Gera HTML completo do PDF do motor (mesmo padrão do app)
 */
export function getMotorHTML(motor, empresa, logoBase64, fotosProcessadas = [], esquemaImagem = null, fotoPlacaBase64 = null, pdfConfig = null) {
  // Usar configurações ou padrão
  const config = pdfConfig || {
    mostrarLogoNoHeader: true,
    mostrarLogoNoFooter: false,
  };

  const mostrarLogoNoHeader = config.mostrarLogoNoHeader;
  const mostrarLogoNoFooter = config.mostrarLogoNoFooter;

  const fotosParaExibir = [];
  if (motor?.fotoPlacaUrl && fotoPlacaBase64) {
    fotosParaExibir.push({ src: fotoPlacaBase64, alt: 'Foto da placa' });
  }
  if (Array.isArray(fotosProcessadas) && fotosProcessadas.length > 0) {
    for (const foto of fotosProcessadas) {
      fotosParaExibir.push({ src: foto, alt: 'Foto do motor' });
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Dados do Motor - ${motor.modelo || "Motor"}</title>
        <style>
          @page { margin: 0; }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'Segoe UI Emoji', 'Segoe UI Symbol', 'Apple Color Emoji', 'Noto Color Emoji';
            color: #1f2937;
            line-height: 1.2;
            font-size: 8px;
            padding: 12px;
          }
          
          ${getHeaderStyles()}
          
          .footer-wrapper {
            position: relative;
            margin-top: 10px;
          }
          .footer {
            position: relative;
            width: 100%;
            margin-top: 0;
          }
          .footer-logo-section {
            display: flex;
            justify-content: flex-end;
            align-items: flex-end;
            padding: 0 0px 0 0;
            margin: 0;
            width: 100%;
          }
          .footer-logo-container {
            display: flex;
            justify-content: flex-end;
            align-items: flex-end;
            margin: 0;
            padding: 0;
          }
          .footer-logo-img {
            height: auto;
            max-height: 108px;
            width: auto;
            max-width: 216px;
            object-fit: contain;
            display: block;
            margin: 0;
            padding: 0;
          }
          .footer-content {
            background-color: #f8f9fa;
            padding: 10px;
            text-align: center;
            font-size: 10px;
            border-top: 1px solid #ddd;
            margin-top: 0;
          }
          
          .compact-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 3px;
            margin-bottom: 5px;
          }
          .compact-field {
            padding: 2px 4px;
            background: #ffffff;
            border-radius: 4px;
            border: 1px solid #cbd5e1;
            display: flex;
            flex-direction: column;
            min-height: 28px;
            justify-content: center;
          }
          .compact-field-label {
            font-size: 6.2px;
            color: #0f172a;
            text-transform: uppercase;
            margin-bottom: 1px;
            font-weight: 600;
            letter-spacing: 0.1px;
            display: flex;
            align-items: center;
            gap: 2px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif, 'Segoe UI Emoji', 'Segoe UI Symbol', 'Apple Color Emoji', 'Noto Color Emoji';
          }
          .compact-field-value {
            font-size: 8.5px;
            color: #0b1220;
            font-weight: 700;
          }
          .section {
            margin-bottom: 6px;
            page-break-inside: avoid;
          }
          .section-title {
            background-color: ${PDF_COLORS.primary};
            color: white;
            padding: 3px 6px;
            margin-bottom: 5px;
            border-radius: 4px;
            font-weight: 700;
            font-size: 8.5px;
            display: flex;
            align-items: center;
            gap: 4px;
          }
          .page-break {
            page-break-before: always;
          }
          .fotos-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px;
            margin-top: 5px;
          }
          .foto-item {
            text-align: center;
          }
          .foto-item img {
            width: 100%;
            max-width: 100%;
            height: auto;
            max-height: 140px;
            object-fit: contain;
            border: 2px solid #e2e8f0;
            border-radius: 4px;
            background: #f8fafc;
            padding: 4px;
          }
          .esquema-container {
            margin: 5px 0;
            text-align: center;
            page-break-inside: avoid;
          }
          .esquema-frame {
            width: 100%;
            max-width: 100%;
            border: 2px solid #e2e8f0;
            border-radius: 6px;
            background: white;
            padding: 6px;
            display: block;
          }
          .esquema-frame img {
            width: 100%;
            max-width: 100%;
            height: auto;
            max-height: 250px;
            object-fit: contain;
            display: block;
          }
          .esquema-frame svg {
            width: 100%;
            height: auto;
            max-height: 250px;
            display: block;
          }
          .observacoes {
            padding: 5px 8px;
            background: linear-gradient(135deg, #fff8e1 0%, #fffbeb 100%);
            border-left: 3px solid #f59e0b;
            border-radius: 4px;
            margin-top: 5px;
            font-size: 8px;
            line-height: 1.3;
          }
          .icon {
            display: inline-block;
            width: 11px;
            height: 11px;
            font-size: 9px;
            text-align: center;
            line-height: 11px;
            background: #ffffff;
            border-radius: 2px;
            font-family: 'Segoe UI Emoji', 'Segoe UI Symbol', 'Apple Color Emoji', 'Noto Color Emoji', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          }
          .icon svg {
            display: block;
            width: 11px;
            height: 11px;
          }
          .first-page-content {
            display: flex;
            flex-direction: column;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        ${getPDFHeaderHTML(empresa, 'MOTOR ELETRICO', logoBase64, mostrarLogoNoHeader)}
        
        <div class="first-page-content">
          <!-- Dados Básicos -->
          <div class="section">
            <div class="section-title">
              <span class="icon">${getSectionIconSVG('clipboard')}</span>
              <span>Dados Básicos</span>
            </div>
            <div class="compact-grid">
              <div class="compact-field">
                <div class="compact-field-label">🏷️ Marca</div>
                <div class="compact-field-value">${formatValue(motor.marca)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">🔧 Modelo</div>
                <div class="compact-field-value">${formatValue(motor.modelo)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">⚡ Potência</div>
                <div class="compact-field-value">${formatValue(motor.potencia)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">🔄 Rotação</div>
                <div class="compact-field-value">${formatValue(motor.rotacao)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">🔌 Voltagem</div>
                <div class="compact-field-value">${formatValue(motor.voltagem)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">📊 Frequência</div>
                <div class="compact-field-value">${formatValue(motor.frequencia)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">🔀 Fase</div>
                <div class="compact-field-value">${formatValue(motor.fase)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">⚡ Amperagem</div>
                <div class="compact-field-value">${formatValue(motor.amperagem)}</div>
              </div>
            </div>
          </div>

          <!-- Dados Físicos -->
          <div class="section">
            <div class="section-title">
              <span class="icon">${getSectionIconSVG('box')}</span>
              <span>Dados Físicos</span>
            </div>
            <div class="compact-grid">
              <div class="compact-field">
                <div class="compact-field-label">📦 Pacote</div>
                <div class="compact-field-value">${formatValue(motor.pacote)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">📏 Diâmetro</div>
                <div class="compact-field-value">${formatValue(motor.diametro)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">📐 Ranhura</div>
                <div class="compact-field-value">${formatValue(motor.canal)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">📊 Área</div>
                <div class="compact-field-value">${formatValue(motor.area)}</div>
              </div>
            </div>
          </div>

          <!-- Enrolamento Principal -->
          <div class="section">
            <div class="section-title">
              <span class="icon">${getSectionIconSVG('bolt')}</span>
              <span>Enrolamento Principal</span>
            </div>
            <div class="compact-grid">
              <div class="compact-field">
                <div class="compact-field-label">🔢 Grupos/Fase</div>
                <div class="compact-field-value">${formatValue(motor.gruposPorFase)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">🔢 Bobinas/Grupo</div>
                <div class="compact-field-value">${formatValue(motor.bobinasPorGrupo)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">📏 Passe</div>
                <div class="compact-field-value">${formatValue(motor.passe)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">🔄 Espiras</div>
                <div class="compact-field-value">${formatValue(motor.espiras)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">🧵 Bitola Fio</div>
                <div class="compact-field-value">${formatValue(motor.bitolaFio)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">🔌 Ligação</div>
                <div class="compact-field-value">${formatValue(motor.ligacao)}</div>
              </div>
              <div class="compact-field">
                <div class="compact-field-label">🔢 Condutor/Ranhura</div>
                <div class="compact-field-value">${formatValue(motor.condutorPorRanhura)}</div>
              </div>
            </div>
          </div>

          ${motor.possuiAuxiliar && motor.auxiliar ? `
            <!-- Enrolamento Auxiliar -->
            <div class="section">
              <div class="section-title">
                <span class="icon">${getSectionIconSVG('bolt')}</span>
                <span>Enrolamento Auxiliar</span>
              </div>
              <div class="compact-grid">
                <div class="compact-field">
                  <div class="compact-field-label">📏 Passe</div>
                  <div class="compact-field-value">${formatValue(motor.auxiliar.passe)}</div>
                </div>
                <div class="compact-field">
                  <div class="compact-field-label">🔄 Espiras</div>
                  <div class="compact-field-value">${formatValue(motor.auxiliar.espiras)}</div>
                </div>
                <div class="compact-field">
                  <div class="compact-field-label">🧵 Fio</div>
                  <div class="compact-field-value">${formatValue(motor.auxiliar.fio)}</div>
                </div>
                <div class="compact-field">
                  <div class="compact-field-label">🔋 Capacitor</div>
                  <div class="compact-field-value">${formatValue(motor.auxiliar.capacitor)}</div>
                </div>
              </div>
            </div>
          ` : ''}

          ${motor.observacoes ? `
            <!-- Observações -->
            <div class="section">
              <div class="section-title">
                <span class="icon">${getSectionIconSVG('pencil')}</span>
                <span>Observações</span>
              </div>
              <div class="observacoes">${motor.observacoes}</div>
            </div>
          ` : ''}

          ${motor.tags && motor.tags.length > 0 ? `
            <!-- Tags -->
            <div class="section">
              <div class="section-title">
                <span class="icon">${getSectionIconSVG('tag')}</span>
                <span>Tags</span>
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 5px; padding: 5px;">
                ${motor.tags.map(tag => `
                  <span style="background-color: ${tag.bg || '#e2e8f0'}; color: ${tag.text || tag.color || '#000'}; padding: 3px 8px; border-radius: 4px; font-size: 8px; font-weight: 600;">
                    ${tag.label}
                  </span>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${fotosParaExibir.length > 0 ? `
            <!-- Fotos -->
            <div class="section page-break">
              <div class="section-title">
                <span class="icon">${getSectionIconSVG('camera')}</span>
                <span>Fotos</span>
              </div>
              <div class="fotos-container">
                ${fotosParaExibir.map((foto) => `
                  <div class="foto-item">
                    <img src="${foto.src}" alt="${foto.alt}" />
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          ${esquemaImagem ? `
            <!-- Esquema Elétrico -->
            <div class="section page-break">
              <div class="section-title">
                <span class="icon">${getSectionIconSVG('plug')}</span>
                <span>Esquema Elétrico</span>
              </div>
              <div class="esquema-container">
                <div class="esquema-frame">
                  ${typeof esquemaImagem === 'string' && esquemaImagem.trim().startsWith('<svg')
                    ? esquemaImagem
                    : `<img src="${esquemaImagem}" alt="Esquema elétrico" />`
                  }
                </div>
              </div>
            </div>
          ` : ''}
        </div>

        ${getPDFFooter(empresa, mostrarLogoNoFooter, logoBase64, motor)}
      </body>
    </html>
  `;
}
