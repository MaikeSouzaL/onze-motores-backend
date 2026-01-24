/**
 * Renderizador de esquema de ligação para SVG (backend)
 * Converte os dados do esquema em SVG que pode ser incluído no HTML/PDF
 */

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function normalizeDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

function calculateEffectiveRadii(poles, config) {
  let effectiveInnerRadius = config.innerRadius;
  let effectiveOuterRadius = config.outerRadius;

  if (config.machineType === 'generator' && poles > 6) {
    const power = (poles - 6) / 2;
    const factor = Math.pow(1.5, power);

    effectiveInnerRadius = config.innerRadius * factor;
    const originalDiff = config.outerRadius - config.innerRadius;
    effectiveOuterRadius = effectiveInnerRadius + originalDiff;
  }

  return { effectiveInnerRadius, effectiveOuterRadius };
}

function generateMotorPoles(poles, options = {}) {
  if (poles < 2) {
    return [];
  }

  const {
    centerX = 500,
    centerY = 500,
    outerRadius = 320,
    innerRadius = 240,
    middleRadius = 280,
    arcSweepDeg,
    phaseType = 'mono',
    machineType = 'motor',
  } = options;

  const arcs = [];

  if (machineType === 'generator') {
    const stepPerPole = 360 / poles;
    const { effectiveInnerRadius, effectiveOuterRadius } = calculateEffectiveRadii(poles, {
      innerRadius,
      outerRadius,
      machineType: 'generator',
    });

    const spiralSweep = arcSweepDeg && arcSweepDeg > 0 ? arcSweepDeg : 45;

    for (let i = 0; i < poles; i++) {
      const startAngleDeg = normalizeDeg(i * stepPerPole);
      const endAngleDeg = normalizeDeg(startAngleDeg + spiralSweep);

      const startRad = degToRad(startAngleDeg);
      const endRad = degToRad(endAngleDeg);

      const x1 = centerX + effectiveOuterRadius * Math.cos(startRad);
      const y1 = centerY + effectiveOuterRadius * Math.sin(startRad);

      const x2 = centerX + effectiveInnerRadius * Math.cos(endRad);
      const y2 = centerY + effectiveInnerRadius * Math.sin(endRad);

      const cpRadius = effectiveOuterRadius;
      const cpAngle = degToRad(startAngleDeg + spiralSweep * 0.5);
      const cpx = centerX + cpRadius * Math.cos(cpAngle);
      const cpy = centerY + cpRadius * Math.sin(cpAngle);

      const pathString = `M ${x1.toFixed(2)} ${y1.toFixed(2)} Q ${cpx.toFixed(2)} ${cpy.toFixed(2)}, ${x2.toFixed(2)} ${y2.toFixed(2)}`;

      arcs.push({ path: pathString });
    }

    return arcs;
  }

  const stepPerPole = 360 / poles;

  let calculatedArcSweepDeg;
  if (arcSweepDeg !== undefined && arcSweepDeg > 0) {
    calculatedArcSweepDeg = arcSweepDeg;
  } else {
    const GAP_ANGLE = 15;
    const availableAngle = 360 / poles;
    calculatedArcSweepDeg = Math.max(5, availableAngle - GAP_ANGLE);
  }

  const createArc = (radius, angleOffset) => {
    for (let i = 0; i < poles; i++) {
      const centerAngleDeg = normalizeDeg(i * stepPerPole + angleOffset);
      const startDeg = normalizeDeg(centerAngleDeg - calculatedArcSweepDeg / 2);
      const endDeg = normalizeDeg(centerAngleDeg + calculatedArcSweepDeg / 2);

      const startRad = degToRad(startDeg);
      const endRad = degToRad(endDeg);

      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      const arcDiff = endDeg < startDeg ? endDeg + 360 - startDeg : endDeg - startDeg;
      const largeArcFlag = arcDiff > 180 ? 1 : 0;

      const pathString = `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${radius.toFixed(2)} ${radius.toFixed(2)} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
      arcs.push({ path: pathString });
    }
  };

  if (phaseType === 'tri') {
    createArc(outerRadius, 0);
    createArc(middleRadius, stepPerPole / 3);
    createArc(innerRadius, (stepPerPole * 2) / 3);
  } else {
    createArc(outerRadius, 0);
    createArc(innerRadius, stepPerPole / 2);
  }

  return arcs;
}

function getPathBounds(pathD) {
  const coords = [];
  const matches = String(pathD).match(/[-+]?[0-9]*\.?[0-9]+/g);
  if (matches) {
    for (const m of matches) {
      coords.push(parseFloat(m));
    }
  }
  if (coords.length < 2) return null;

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < coords.length; i += 2) {
    const x = coords[i];
    const y = coords[i + 1];
    if (x !== undefined && y !== undefined) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  return { minX, maxX, minY, maxY };
}

function calculateContentBounds(paths, textos, symbols, arcCoilConfig) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let hasContent = false;

  (paths || []).forEach((p) => {
    const pathD = p?.path || p;
    if (typeof pathD === 'string') {
      const bounds = getPathBounds(pathD);
      if (bounds) {
        minX = Math.min(minX, bounds.minX);
        maxX = Math.max(maxX, bounds.maxX);
        minY = Math.min(minY, bounds.minY);
        maxY = Math.max(maxY, bounds.maxY);
        hasContent = true;
      }
    }
  });

  (textos || []).forEach((t) => {
    if (t?.x !== undefined && t?.y !== undefined) {
      minX = Math.min(minX, t.x - 20);
      maxX = Math.max(maxX, t.x + 100);
      minY = Math.min(minY, t.y - 20);
      maxY = Math.max(maxY, t.y + 10);
      hasContent = true;
    }
  });

  (symbols || []).forEach((s) => {
    if (s?.x !== undefined && s?.y !== undefined) {
      const size = s.size || 40;
      minX = Math.min(minX, s.x - size);
      maxX = Math.max(maxX, s.x + size);
      minY = Math.min(minY, s.y - size);
      maxY = Math.max(maxY, s.y + size);
      hasContent = true;
    }
  });

  if (arcCoilConfig?.visible && Array.isArray(arcCoilConfig.coils) && arcCoilConfig.coils.length > 0) {
    arcCoilConfig.coils.forEach((coil) => {
      const startRad = degToRad(coil.startAngle);
      const endRad = degToRad(coil.endAngle);

      const startX = coil.centerX + coil.radius * Math.cos(startRad);
      const startY = coil.centerY + coil.radius * Math.sin(startRad);
      const endX = coil.centerX + coil.radius * Math.cos(endRad);
      const endY = coil.centerY + coil.radius * Math.sin(endRad);

      const points = [
        { x: coil.centerX, y: coil.centerY },
        { x: startX, y: startY },
        { x: endX, y: endY },
      ];

      points.forEach((p) => {
        minX = Math.min(minX, p.x - coil.radius);
        maxX = Math.max(maxX, p.x + coil.radius);
        minY = Math.min(minY, p.y - coil.radius);
        maxY = Math.max(maxY, p.y + coil.radius);
      });

      hasContent = true;
    });
  }

  if (!hasContent) {
    return { minX: 0, maxX: 400, minY: 0, maxY: 400 };
  }

  const padding = 40;
  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding,
  };
}

/**
 * Renderiza um esquema de ligação como SVG Data URL
 * @param {Object} esquemaDados - Dados do esquema (MotorEsquemaLigacao)
 * @returns {string|null} SVG como data URL ou null se não houver dados
 */
export function renderEsquemaToSVG(esquemaDados) {
  if (!esquemaDados) {
    return null;
  }

  const { 
    paths = [], 
    textos = [], 
    symbols = [],
    arcCoilConfig,
    polosConfig,
    canvasSize = { width: 800, height: 600 },
    legendConfig,
    statorConfig
  } = esquemaDados;

  const savedCanvasWidth = canvasSize?.width;
  const savedCanvasHeight = canvasSize?.height;

  const hasStator = !!(statorConfig && statorConfig.visible);
  const hasPolos = !!(polosConfig && polosConfig.visible);
  const bounds = calculateContentBounds(paths, textos, symbols, arcCoilConfig);

  let originalWidth;
  let originalHeight;
  let originalCx;
  let originalCy;

  if (savedCanvasWidth && savedCanvasHeight) {
    originalWidth = savedCanvasWidth;
    originalHeight = savedCanvasHeight;
    originalCx = originalWidth / 2;
    originalCy = originalHeight / 2;
  } else {
    if (hasStator && Array.isArray(symbols) && symbols.length > 0) {
      let sumX = 0;
      let sumY = 0;
      symbols.forEach((s) => {
        sumX += s.x || 0;
        sumY += s.y || 0;
      });
      originalCx = sumX / symbols.length;
      originalCy = sumY / symbols.length;
    } else {
      originalCx = (bounds.minX + bounds.maxX) / 2;
      originalCy = (bounds.minY + bounds.maxY) / 2;
    }

    originalWidth = Math.max(400, bounds.maxX - bounds.minX + 100);
    originalHeight = Math.max(500, bounds.maxY - bounds.minY + 100);
  }

  let viewBoxMinX = 0;
  let viewBoxMinY = 0;
  let viewBoxMaxX = originalWidth;
  let viewBoxMaxY = originalHeight;

  if (hasStator) {
    const statorRadius = (statorConfig.radius || 0) * 1.25;
    viewBoxMinX = Math.min(viewBoxMinX, originalCx - statorRadius - 30);
    viewBoxMinY = Math.min(viewBoxMinY, originalCy - statorRadius - 30);
    viewBoxMaxX = Math.max(viewBoxMaxX, originalCx + statorRadius + 30);
    viewBoxMaxY = Math.max(viewBoxMaxY, originalCy + statorRadius + 30);
  }

  if (hasPolos) {
    const poles = polosConfig.poles || 0;
    const { effectiveOuterRadius } = calculateEffectiveRadii(poles, {
      innerRadius: polosConfig.innerRadius,
      outerRadius: polosConfig.outerRadius,
      machineType: polosConfig.machineType,
    });
    const polesRadius = effectiveOuterRadius * 1.1;
    viewBoxMinX = Math.min(viewBoxMinX, originalCx - polesRadius - 30);
    viewBoxMinY = Math.min(viewBoxMinY, originalCy - polesRadius - 30);
    viewBoxMaxX = Math.max(viewBoxMaxX, originalCx + polesRadius + 30);
    viewBoxMaxY = Math.max(viewBoxMaxY, originalCy + polesRadius + 30);
  }

  if (bounds?.minX !== Infinity) {
    viewBoxMinX = Math.min(viewBoxMinX, bounds.minX);
    viewBoxMinY = Math.min(viewBoxMinY, bounds.minY);
    viewBoxMaxX = Math.max(viewBoxMaxX, bounds.maxX);
    viewBoxMaxY = Math.max(viewBoxMaxY, bounds.maxY);
  }

  const extraPadding = 20;
  viewBoxMinX -= extraPadding;
  viewBoxMinY -= extraPadding;
  viewBoxMaxX += extraPadding;
  viewBoxMaxY += extraPadding;

  const viewBoxWidth = viewBoxMaxX - viewBoxMinX;
  const viewBoxHeight = viewBoxMaxY - viewBoxMinY;

  const outputWidth = 800;
  const outputHeight = 600;

  // Início do SVG (inline)
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${outputWidth}" height="${outputHeight}" viewBox="${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}" preserveAspectRatio="xMidYMid meet">`;

  // Fundo branco
  svg += `<rect x="${viewBoxMinX}" y="${viewBoxMinY}" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="white"/>`;

  // Renderizar stator (se visível)
  if (statorConfig && statorConfig.visible) {
    const { slots = 24, radius = 200 } = statorConfig;
    const centerX = originalCx;
    const centerY = originalCy;
    
    // Círculo do estator
    svg += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" stroke="#003d66" stroke-width="2" fill="none"/>`;
    
    // Slots do estator
    for (let i = 0; i < slots; i++) {
      const angle = (i * 360) / slots;
      const rad = (angle * Math.PI) / 180;
      const x = centerX + radius * Math.cos(rad);
      const y = centerY + radius * Math.sin(rad);
      svg += `<circle cx="${x}" cy="${y}" r="3" fill="#003d66"/>`;
    }
  }

  // Renderizar polos (se visível)
  if (polosConfig && polosConfig.visible) {
    const arcs = generateMotorPoles(polosConfig.poles, {
      centerX: originalCx,
      centerY: originalCy,
      outerRadius: polosConfig.outerRadius,
      innerRadius: polosConfig.innerRadius,
      middleRadius: polosConfig.middleRadius,
      arcSweepDeg: polosConfig.arcSweepDeg,
      phaseType: polosConfig.phaseType,
      machineType: polosConfig.machineType,
    });

    arcs.forEach((arc, index) => {
      const color = Array.isArray(polosConfig.poleColors) ? (polosConfig.poleColors[index] || polosConfig.color) : polosConfig.color;
      const strokeWidth = polosConfig.strokeWidth || 2;
      svg += `<path d="${arc.path}" stroke="${color || '#01293f'}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    });
  }

  // Renderizar bobinas em arco (se visível)
  if (arcCoilConfig && arcCoilConfig.visible && arcCoilConfig.coils) {
    arcCoilConfig.coils.forEach(coil => {
      const { centerX, centerY, radius, startAngle, endAngle, strokeWidth = 2, color = '#01293f', label } = coil;
      
      // Converter ângulos para radianos
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Calcular pontos do arco
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);
      
      // Determinar se é arco grande
      const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0;
      
      // Desenhar arco
      svg += `<path d="M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}" stroke="${color}" stroke-width="${strokeWidth}" fill="none"/>`;
      
      // Label da bobina
      if (label) {
        const midAngle = (startAngle + endAngle) / 2;
        const midRad = (midAngle * Math.PI) / 180;
        const labelX = centerX + (radius + 20) * Math.cos(midRad);
        const labelY = centerY + (radius + 20) * Math.sin(midRad);
        svg += `<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="12" fill="${color}">${label}</text>`;
      }
    });
  }

  // Renderizar paths (linhas de conexão)
  paths.forEach(pathData => {
    const path = typeof pathData === 'string' ? pathData : pathData.path;
    const color = typeof pathData === 'object' && pathData.color ? pathData.color : '#01293f';
    let dashArray = null;
    if (typeof pathData === 'object' && pathData.dashArray) {
      if (Array.isArray(pathData.dashArray)) {
        dashArray = pathData.dashArray.join(',');
      } else if (typeof pathData.dashArray === 'string') {
        dashArray = pathData.dashArray;
      }
    }
    const dashAttr = dashArray ? ` stroke-dasharray="${dashArray}"` : '';
    svg += `<path d="${path}" stroke="${color}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"${dashAttr}/>`;
  });

  // Renderizar símbolos
  symbols.forEach(symbol => {
    const { type, x, y, size = 20, color = '#01293f', label, rotation = 0 } = symbol;
    
    const transform = rotation ? `transform="rotate(${rotation} ${x} ${y})"` : '';
    
    switch (type) {
      case 'coil':
        // Bobina (retângulo)
        svg += `<rect x="${x - size/2}" y="${y - size/2}" width="${size}" height="${size}" stroke="${color}" stroke-width="2" fill="none" ${transform}/>`;
        if (label) {
          svg += `<text x="${x}" y="${y + size + 12}" text-anchor="middle" font-size="10" fill="${color}">${label}</text>`;
        }
        break;
      
      case 'capacitor':
        // Capacitor (duas linhas paralelas)
        svg += `<g ${transform}>
          <line x1="${x - size/2}" y1="${y - size/3}" x2="${x - size/2}" y2="${y + size/3}" stroke="${color}" stroke-width="2"/>
          <line x1="${x + size/2}" y1="${y - size/3}" x2="${x + size/2}" y2="${y + size/3}" stroke="${color}" stroke-width="2"/>
        </g>`;
        if (label) {
          svg += `<text x="${x}" y="${y + size}" text-anchor="middle" font-size="10" fill="${color}">${label}</text>`;
        }
        break;
      
      case 'terminal':
        // Terminal (círculo)
        svg += `<circle cx="${x}" cy="${y}" r="${size/2}" stroke="${color}" stroke-width="2" fill="white" ${transform}/>`;
        if (label) {
          svg += `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" fill="${color}" font-weight="bold">${label}</text>`;
        }
        break;
      
      case 'switch':
        // Chave (linha diagonal)
        svg += `<g ${transform}>
          <line x1="${x - size/2}" y1="${y}" x2="${x + size/2}" y2="${y - size/2}" stroke="${color}" stroke-width="2"/>
          <circle cx="${x - size/2}" cy="${y}" r="3" fill="${color}"/>
          <circle cx="${x + size/2}" cy="${y}" r="3" fill="${color}"/>
        </g>`;
        break;
      
      case 'ground':
        // Terra
        svg += `<g ${transform}>
          <line x1="${x}" y1="${y - size/2}" x2="${x}" y2="${y + size/2}" stroke="${color}" stroke-width="2"/>
          <line x1="${x - size/2}" y1="${y + size/2}" x2="${x + size/2}" y2="${y + size/2}" stroke="${color}" stroke-width="2"/>
        </g>`;
        break;
      
      default:
        // Símbolo genérico (círculo)
        svg += `<circle cx="${x}" cy="${y}" r="${size/2}" stroke="${color}" stroke-width="2" fill="none" ${transform}/>`;
    }
  });

  // Renderizar textos
  textos.forEach(texto => {
    const { texto: text, x = 0, y = 0, fontSize = 12, color = '#000000' } = texto;
    if (text) {
      svg += `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${color}">${text}</text>`;
    }
  });

  // Renderizar legenda (se visível)
  if (legendConfig && legendConfig.visible) {
    const legendY = viewBoxMinY + viewBoxHeight - 60;
    const legendItems = [];
    
    if (legendConfig.modelo) legendItems.push(`Modelo: ${legendConfig.modelo}`);
    if (legendConfig.marca) legendItems.push(`Marca: ${legendConfig.marca}`);
    if (legendConfig.potencia) legendItems.push(`Potência: ${legendConfig.potencia}`);
    if (legendConfig.tensao) legendItems.push(`Tensão: ${legendConfig.tensao}`);
    if (legendConfig.rpm) legendItems.push(`RPM: ${legendConfig.rpm}`);
    
    if (legendItems.length > 0) {
      svg += `<rect x="${viewBoxMinX + 10}" y="${legendY - 35}" width="${viewBoxWidth - 20}" height="50" fill="#f8f9fa" stroke="#003d66" stroke-width="1" rx="4"/>`;
      legendItems.forEach((item, index) => {
        svg += `<text x="${viewBoxMinX + 20}" y="${legendY - 20 + (index * 15)}" font-size="10" fill="#01293f">${item}</text>`;
      });
    }
  }

  // Fim do SVG
  svg += `</svg>`;

  // Retornar SVG inline (mais compatível com HTML->PDF)
  return svg;
}
