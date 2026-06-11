let itensProdutos = [];       // dados brutos
let filteredIndices = [];     // índices dos itens após filtro

function getTagText(parent, tagName) {
    const el = parent.getElementsByTagName(tagName)[0];
    return el ? el.textContent : "";
}

async function parseXMLAndExtract(xmlString) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    if (xmlDoc.getElementsByTagName("parsererror").length) throw new Error("XML inválido ou mal estruturado");

    let vFreteTotalNF = 0, vSeguroTotalNF = 0;
    const icmsTot = xmlDoc.getElementsByTagName("ICMSTot")[0];
    if (icmsTot) {
        vFreteTotalNF = parseFloat(getTagText(icmsTot, "vFrete") || "0");
        vSeguroTotalNF = parseFloat(getTagText(icmsTot, "vSeg") || "0");
    }

    const detNodes = xmlDoc.getElementsByTagName("det");
    if (!detNodes.length) throw new Error("Nenhum item <det> encontrado no XML.");

    const itens = [];
    for (let det of detNodes) {
        const prod = det.getElementsByTagName("prod")[0];
        if (!prod) continue;
        const cProd = getTagText(prod, "cProd") || "---";
        const xProd = getTagText(prod, "xProd") || "Sem descrição";
        const qCom = parseFloat(getTagText(prod, "qCom") || "0");
        const vProd = parseFloat(getTagText(prod, "vProd") || "0");
        if (qCom === 0) continue;

        let vICMS = 0, vIPI = 0, vPIS = 0, vCOFINS = 0;
        let vICMSST = 0, vFCPST = 0, vIBS = 0, vCBS = 0;

        const imposto = det.getElementsByTagName("imposto")[0];
        if (imposto) {
            const icmsNode = imposto.getElementsByTagName("ICMS")[0];
            if (icmsNode) {
                const icms00 = icmsNode.getElementsByTagName("ICMS00")[0];
                if (icms00) {
                    vICMS = parseFloat(getTagText(icms00, "vICMS") || "0");
                } else {
                    const icms10 = icmsNode.getElementsByTagName("ICMS10")[0];
                    if (icms10) {
                        vICMS = parseFloat(getTagText(icms10, "vICMS") || "0");
                        vICMSST = parseFloat(getTagText(icms10, "vICMSST") || "0");
                        vFCPST = parseFloat(getTagText(icms10, "vFCPST") || "0");
                    } else {
                        const anyICMS = icmsNode.querySelector("[vICMS]");
                        if (anyICMS) vICMS = parseFloat(anyICMS.getAttribute("vICMS") || "0");
                    }
                }
            }
            const ipiNode = imposto.getElementsByTagName("IPI")[0];
            if (ipiNode) {
                const ipiTrib = ipiNode.getElementsByTagName("IPITrib")[0];
                if (ipiTrib) vIPI = parseFloat(getTagText(ipiTrib, "vIPI") || "0");
            }
            const pisNode = imposto.getElementsByTagName("PIS")[0];
            if (pisNode) {
                const pisAliq = pisNode.getElementsByTagName("PISAliq")[0];
                if (pisAliq) vPIS = parseFloat(getTagText(pisAliq, "vPIS") || "0");
            }
            const cofinsNode = imposto.getElementsByTagName("COFINS")[0];
            if (cofinsNode) {
                const cofinsAliq = cofinsNode.getElementsByTagName("COFINSAliq")[0];
                if (cofinsAliq) vCOFINS = parseFloat(getTagText(cofinsAliq, "vCOFINS") || "0");
            }
            const ibsCbsNode = imposto.getElementsByTagName("IBSCBS")[0];
            if (ibsCbsNode) {
                const gIBS = ibsCbsNode.getElementsByTagName("gIBSCBS")[0];
                if (gIBS) {
                    vIBS = parseFloat(getTagText(gIBS, "vIBS") || "0");
                    const gCBS = gIBS.getElementsByTagName("gCBS")[0];
                    if (gCBS) vCBS = parseFloat(getTagText(gCBS, "vCBS") || "0");
                }
            }
        }

        itens.push({
            codigo: cProd,
            produto: xProd,
            quantidade: qCom,
            valorTotalProduto: vProd,
            vICMS, vIPI, vPIS, vCOFINS, vICMSST, vFCPST, vIBS, vCBS,
            impostosEfetivos: vIPI + vICMSST + vFCPST   // apenas esses entram no custo
        });
    }
    return { itens, vFreteTotalNF, vSeguroTotalNF };
}

// Função que aplica filtro e renderiza apenas itens que batem com a busca
function filterAndRender(markupPercent, freteTotal, seguroTotal, filterText = "") {
    if (!itensProdutos.length) {
        document.getElementById("tableBody").innerHTML = '<tr><td colspan="7" style="text-align:center;">📂 Nenhum produto importado. Faça upload do XML.</td></tr>';
        document.getElementById("footerTotals").innerHTML = "<div>⚠️ Carregue uma NF-e para visualizar os cálculos.</div>";
        return;
    }

    const lowerFilter = filterText.toLowerCase().trim();
    let filteredItems = itensProdutos;
    if (lowerFilter !== "") {
        filteredItems = itensProdutos.filter(item =>
            item.codigo.toLowerCase().includes(lowerFilter) ||
            item.produto.toLowerCase().includes(lowerFilter)
        );
    }

    if (filteredItems.length === 0) {
        document.getElementById("tableBody").innerHTML = '<tr><td colspan="7" class="no-results">🔎 Nenhum produto encontrado com o filtro aplicado.</td></tr>';
        document.getElementById("footerTotals").innerHTML = "<div>📌 Nenhum item corresponde ao filtro.</div>";
        return;
    }

    renderTabelaComFiltro(filteredItems, markupPercent, freteTotal, seguroTotal);
}

function renderTabelaComFiltro(itensFiltrados, markupPercent, freteTotal, seguroTotal) {
    const tbody = document.getElementById("tableBody");
    const somaValorProdutos = itensFiltrados.reduce((acc, i) => acc + i.valorTotalProduto, 0);
    if (somaValorProdutos === 0) {
        tbody.innerHTML = '<tr><td colspan="7">Nenhum valor válido</td></tr>';
        return;
    }

    let somaCustoRealTotal = 0;
    let somaImpostosEfetivosTotal = 0;
    let somaImpostosDemoTotal = 0;
    let somaFreteRateado = 0;
    let somaSeguroRateado = 0;
    let quantidadeTotal = 0;
    const rows = [];

    for (const item of itensFiltrados) {
        const valorProd = item.valorTotalProduto;
        const quant = item.quantidade;
        quantidadeTotal += quant;

        const rateioFrete = (valorProd / somaValorProdutos) * freteTotal;
        const rateioSeguro = (valorProd / somaValorProdutos) * seguroTotal;

        const custoRealItem = valorProd + item.impostosEfetivos + rateioFrete + rateioSeguro;
        const custoUnitarioReal = custoRealItem / quant;
        const precoVenda = custoUnitarioReal * (1 + markupPercent / 100);

        somaCustoRealTotal += custoRealItem;
        somaImpostosEfetivosTotal += item.impostosEfetivos;
        somaImpostosDemoTotal += (item.vICMS + item.vIPI + item.vPIS + item.vCOFINS + item.vICMSST + item.vFCPST + item.vIBS + item.vCBS);
        somaFreteRateado += rateioFrete;
        somaSeguroRateado += rateioSeguro;

        const detalhes = [];
        if (item.vICMS !== 0) detalhes.push(`ICMS: R$ ${item.vICMS.toFixed(2)} ⚠️ (demonstrativo)`);
        if (item.vIPI !== 0) detalhes.push(`IPI: R$ ${item.vIPI.toFixed(2)} ✔️ (Contabiliza no custo)`);
        if (item.vPIS !== 0) detalhes.push(`PIS: R$ ${item.vPIS.toFixed(2)} ⚠️ (demonstrativo)`);
        if (item.vCOFINS !== 0) detalhes.push(`COFINS: R$ ${item.vCOFINS.toFixed(2)} ⚠️ (demonstrativo)`);
        if (item.vICMSST !== 0) detalhes.push(`ICMS ST: R$ ${item.vICMSST.toFixed(2)} ✔️ (Contabiliza no custo)`);
        if (item.vFCPST !== 0) detalhes.push(`FCP ST: R$ ${item.vFCPST.toFixed(2)} ✔️ (Contabiliza no custo)`);
        if (item.vIBS !== 0) detalhes.push(`IBS: R$ ${item.vIBS.toFixed(2)} ⚠️ (demonstrativo)`);
        if (item.vCBS !== 0) detalhes.push(`CBS: R$ ${item.vCBS.toFixed(2)} ⚠️ (demonstrativo)`);
        if (rateioFrete !== 0) detalhes.push(`🚛 Frete rateado: R$ ${rateioFrete.toFixed(2)} ✔️`);
        if (rateioSeguro !== 0) detalhes.push(`🛡️ Seguro rateado: R$ ${rateioSeguro.toFixed(2)} ✔️`);
        if (detalhes.length === 0) detalhes.push("Nenhum tributo incidente");

        rows.push(`
            <tr>
                <td class="valor-num">${escapeHtml(item.codigo)}</td>
                <td class="prod-name">${escapeHtml(item.produto)}</td>
                <td>${item.quantidade.toFixed(2)}</td>
                <td class="valor-num">${item.valorTotalProduto.toFixed(2)}</td>
                <td class="impostos-cell"><pre style="margin:0; white-space:pre-wrap;">${detalhes.join("\n")}</pre></td>
                <td class="valor-num"><strong>R$ ${custoUnitarioReal.toFixed(2)}</strong></td>
                <td class="valor-num suggested">R$ ${precoVenda.toFixed(2)}</td>
            </tr>
        `);
    }

    tbody.innerHTML = rows.join("");
    const impostosDemoOnly = somaImpostosDemoTotal - somaImpostosEfetivosTotal;
    document.getElementById("footerTotals").innerHTML = `
        <div><strong>💰 Total produtos (filtro):</strong> R$ ${somaValorProdutos.toFixed(2)}</div>
        <div><strong>📋 Impostos demonstrativos (ICMS+PIS+COFINS+IBS+CBS):</strong> R$ ${impostosDemoOnly.toFixed(2)}<br><span style="font-size:0.7rem;">⚠️ Não integram o custo final.</span></div>
        <div><strong>✔️ Impostos que impactam custo (IPI+ICMS ST+FCP ST):</strong> R$ ${somaImpostosEfetivosTotal.toFixed(2)}</div>
        <div><strong>🚚 Frete rateado:</strong> R$ ${somaFreteRateado.toFixed(2)} &nbsp;| <strong>📦 Seguro rateado:</strong> R$ ${somaSeguroRateado.toFixed(2)}</div>
        <div><strong>💵 CUSTO REAL TOTAL (Produtos + Efetivos + Frete + Seguro):</strong> R$ ${somaCustoRealTotal.toFixed(2)}</div>
        <div><strong>🏷️ Markup aplicado:</strong> ${markupPercent}% &nbsp;| <strong>Preço médio venda sugerido (unitário):</strong> R$ ${(somaCustoRealTotal / quantidadeTotal).toFixed(2)}</div>
    `;
}

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function refreshWithCurrentFilters() {
    if (!itensProdutos.length) {
        document.getElementById("tableBody").innerHTML = '<tr><td colspan="7">📂 Carregue um XML primeiro.</td></tr>';
        return;
    }
    const markup = parseFloat(document.getElementById("markupPercent").value) || 0;
    const frete = parseFloat(document.getElementById("freteTotal").value) || 0;
    const seguro = parseFloat(document.getElementById("seguroTotal").value) || 0;
    const filterText = document.getElementById("filterInput").value;
    filterAndRender(markup, frete, seguro, filterText);
}

async function processXMLFile(file) {
    const statusDiv = document.getElementById("statusMsg");
    statusDiv.innerHTML = "⏳ Processando XML...";
    try {
        const text = await file.text();
        const { itens, vFreteTotalNF, vSeguroTotalNF } = await parseXMLAndExtract(text);
        itensProdutos = itens;
        document.getElementById("freteTotal").value = vFreteTotalNF.toFixed(2);
        document.getElementById("seguroTotal").value = vSeguroTotalNF.toFixed(2);
        // limpa filtro
        document.getElementById("filterInput").value = "";
        refreshWithCurrentFilters();
        statusDiv.innerHTML = `✅ Nota carregada: ${itens.length} itens | Frete NF: R$ ${vFreteTotalNF.toFixed(2)} | Seguro NF: R$ ${vSeguroTotalNF.toFixed(2)}`;
    } catch (err) {
        console.error(err);
        statusDiv.innerHTML = `❌ Erro: ${err.message}`;
        itensProdutos = [];
        document.getElementById("tableBody").innerHTML = `<tr><td colspan="7" style="color:#b91c1c;">Falha: ${err.message}</td></tr>`;
    }
}

// Eventos
document.getElementById("xmlUpload").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) processXMLFile(file);
});
document.getElementById("refreshCalc").addEventListener("click", () => refreshWithCurrentFilters());
document.getElementById("filterInput").addEventListener("input", () => refreshWithCurrentFilters());
document.getElementById("clearFilter").addEventListener("click", () => {
    document.getElementById("filterInput").value = "";
    refreshWithCurrentFilters();
});
["markupPercent", "freteTotal", "seguroTotal"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", () => { if (itensProdutos.length) refreshWithCurrentFilters(); });
});
