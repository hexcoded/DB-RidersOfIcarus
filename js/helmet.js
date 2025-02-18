﻿// Variaveis
const arquivosDeTraducao = [
    "../database/translate/localstringdata_item_armor.csv",
    "../database/translate/localstringdata_item_armor_02.csv"
];
const arquivoPrincipal = "../database/itemdata/itemdata_armor.csv"
const arquivoEfeitos = "../database/translate/MinhaTraducao.csv"
const arquivoButton = "../database/button/itemdata_armor.csv"
const arquivoIcones = "../database/itemdata/itemres_accessory.csv"
const filtraTipo = "ja"
const itemPadrao = "NPC_0401;대장군 (401);1.000000;1.000000;0.000000;1.000000;GD;*;*;1.000000;ja;*;no;0.000000;39.000000;39.000000;0.000000;0.000000;0.000000;*;*;*;*;0.000000;0.000000;0.000000;*;0.000000;0.000000;*;0.000000;0.000000;0.000000;N;N;N;0.000000;r1;1.000000;0.000000;0.000000;0.000000;req;none;ch;0.000000;*;1.000000;*;*;0.000000;0.000000;GU_Test_3_0002;AR4_400_1_6500;*;*;0.000000;0.000000;0.000000;*;*;*;1.000000;0.000000;0.000000;30.000000;100.000000;1.000000;*;*"
let mapaDeTraducoes = {}
let itemArray = []
let mapaEfeitos = {}
let codigoOriginal // não mexer aqui <<
// Carrega Arquivos .csv
// loadItems = Cria botões pra cada item encontrado.
async function loadItems(itemPath, iconPath, filterType) {
    const response = await fetch(itemPath);
    const text = await response.text();
    const lines = text.trim().split(/\r?\n/);

    const responseI = await fetch(iconPath);
    const textoI = await responseI.text();
    const linesI = textoI.trim().split(/\r?\n/);

    // Remove cabeçalhos
    lines.shift();

    const container = document.getElementById("botaoContainer");

    // 🔹 Criar um mapa de ícones para associar ID → Ícone
    let mapaDeIcones = {};
    linesI.forEach(lineI => {
        const [idI, iconI] = lineI.split(';');
        mapaDeIcones[idI.trim()] = iconI.trim();
    });

    // Criar botões para cada item
    lines.forEach((line, index) => {
        const [id, level, rarity, type] = line.split(';');
        let leveli = parseInt(level);

        if (type !== filterType) return;

        const button = document.createElement("button");
        button.className = "item-button";
        button.setAttribute("data-index", id);
        button.setAttribute("onclick", `mudarItem(${index})`);

        const img = document.createElement("img");
        img.className = "item-img";
        
        // 🔹 Definir o ícone correspondente ao item pelo ID
        let iconFileName = mapaDeIcones[id] || "favicon"; // Se não existir, usa "favicon"

        img.src = `../imgs/${iconFileName}.png`;

        // 🔹 Verifica se a imagem existe
        let imgTest = new Image();
        imgTest.src = img.src;
        imgTest.onload = function () {
            img.src = imgTest.src; 
        };
        imgTest.onerror = function () {
            img.src = `../imgs/favicon.png`;
        };

        const div = document.createElement("div");

        const itemName = document.createElement("p");
        itemName.className = `espaco itemnomebutton ${rarity}`;

        const itemDesc = document.createElement("p");
        itemDesc.className = "espaco itemdescbutton";
        itemDesc.textContent = `ID: ${id} | Level: ${leveli}`;

        div.appendChild(itemName);
        div.appendChild(itemDesc);
        button.appendChild(img);
        button.appendChild(div);

        container.appendChild(button);
    });

    // 🔹 Aguarda a tradução dos nomes
    await carregarTraducoes(); 

    if (!mapaDeTraducoes || Object.keys(mapaDeTraducoes).length === 0) {
        console.warn("mapaDeTraducoes ainda não carregado.");
        return;
    }

    // 🔹 Atualiza os nomes dos itens
    document.querySelectorAll(".item-button").forEach(button => {
        let itemID = button.getAttribute("data-index"); 
        let itemTraduzido = mapaDeTraducoes[itemID];

        if (itemTraduzido) {
            button.querySelector(".itemnomebutton").textContent = itemTraduzido.nome || itemID;
        } else {
            button.querySelector(".itemnomebutton").textContent = itemID;
        }
    });
}

async function carregarTraducoes() {
    const promessas = arquivosDeTraducao.map(arquivo =>
        fetch(arquivo)
            .then(response => response.text())
            .then(csvText => {
                let linhasCorrigidas = csvText.replace(/\n(?=[^\^])/g, " ")
                return Papa.parse(linhasCorrigidas, { header: true, skipEmptyLines: true }).data;
            })
            .then(dados => {
                dados.forEach(row => {
                    if (!row.t_key || !row.t_korean || !row.t_key.startsWith("^")) {
                        console.warn(`⚠️ Linha inválida ignorada em ${arquivo}:`, row);
                        return; // Ignora linhas desalinhadas
                    }

                    let id = row.t_key.replace(/^(\^)|(\^$)/g, ""); // Remove ^ do início e fim
                    let textoTraduzido = row.t_korean.replace(/\^/g, "").trim(); // Remove ^ internos

                    if (id.endsWith("_Name")) {
                        id = id.replace("_Name", "");
                        mapaDeTraducoes[id] = { nome: textoTraduzido };
                    } else if (id.endsWith("_Description")) {
                        id = id.replace("_Description", "");
                        if (!mapaDeTraducoes[id]) mapaDeTraducoes[id] = {};
                        mapaDeTraducoes[id].descricao = textoTraduzido.replace(/<[^>]+>/g, "").trim()
                    }
                })
            })
            .catch(error => console.error(`❌ Erro ao carregar ${arquivo}:`, error))
    );

    await Promise.all(promessas); // Aguarda todos os arquivos carregarem
}

async function carregarCSV() {
    const response = await fetch(arquivoPrincipal);
    const blob = await response.blob(); // Obtém os dados como um Blob
    const reader = new FileReader();

    reader.onload = function () {
        const text = new TextDecoder("euc-kr").decode(reader.result); // Decodifica como EUC-KR
        Papa.parse(text, {
            delimiter: ";",
            header: true,
            skipEmptyLines: true,
            complete: function (parsed) {
                itemArray = parsed.data; // Salva os dados no array global
            }
        });
    };

    reader.readAsArrayBuffer(blob); // Lê o Blob como ArrayBuffer
}

function exibirLinhaOriginal(id) {
    let nomeTraduzido = mapaDeTraducoes[id]?.nome || "";

    if (!nomeTraduzido) {
        nomeTraduzido = "";
    }

    let linhaOriginal = `^${id}_Name^,^${nomeTraduzido}^`;

    document.getElementById("nomedoItemtraduzido").value = linhaOriginal;
}

async function carregarIconeDoItem(itemID) {
    const response = await fetch(arquivoIcones);
    const text = await response.text();
    const lines = text.trim().split(/\r?\n/);

    // Pular o cabeçalho
    // lines.shift();

    let iconeEncontrado = null;

    for (let line of lines) {
        const [id, icon] = line.split(';');
        if (id === itemID) {
            iconeEncontrado = icon;
            break;
        }
    }

    let imgElement = document.getElementById("itemIcone");
    let img = new Image();

    if (iconeEncontrado) {
        img.src = `../imgs/${iconeEncontrado}.png`;
    } else {
        img.src = `../imgs/favicon.png`;
    }
}
 
function atualizarItem() {
    let codigoBruto = document.getElementById("codigoItem").value.trim();
    if (!codigoBruto) {
        document.getElementById("codigoItem").value = itemPadrao;

        // Atualiza codigoBruto para evitar erro no split()
        codigoBruto = document.getElementById("codigoItem").value;
    }
    let partes = codigoBruto.split(";");

    if (partes.length == 70) {
        let id = partes[0]; // id do item
        let nome = partes[1]; // Nome do item
        let desenvolvimento = partes[2]; // desenvolvimento
        let nivelmin = partes[3]; // Nível necessario
        let nivelmax = partes[4]; // Nível maximo
        let nivelitem = partes[5]; // Nivel do item , Poder do item
        let classes = partes[6]; // Classes que podem equipar
        let classesstat = partes[7]; // Classe dos status aleatorios
        let usabilidade = partes[8]; // Usabilidade
        let grau = partes[9]; // Grau
        let tipopart = partes[10] // equipped_parts
        let armormaterial = partes[11] //
        let attributetype = partes[12] //
        let defenseattribute = partes[13] // defense attribute gauge
        let defesafisica = partes[14] //
        let defesamagica = partes[15] //
        let durability = partes[16]
        let precobuy = partes[17]
        let precosell = partes[18]
        let aplicacaoaleaatoria = partes[23]
        let aplicacaoaleaatoriamin = partes[24]
        let aplicacaoaleaatoriamax = partes[25]
        let randomstatsration = partes[26] // option application ratio
        let sealedfellowmin = partes[27]
        let sealedfellowmax = partes[28]
        let variableitem = partes[29]
        let minvariableitem = partes[30]
        let maxvariableitem = partes[31]
        let sealstonesmax = partes[32] // provavelmente o primeiro slot
        let soulstone1 = partes[33] // 
        let soulstone2 = partes[34] // 
        let soulstone3 = partes[35] // 
        let reinforcementrestriction = partes[36]
        let reinforcementprob = partes[37]
        let dropped = partes[38] // Cannot be Dropped
        let traded = partes[39] // Cannot be Traded
        let disposed = partes[40] // Cannot be disposed
        let destructed = partes[41] // Cannot be Destructed
        let levelcheckdrop = partes[42] //
        let vinculacao = partes[43] // binding target
        let desvinculacao = partes[44] // number of unbindings
        let usagerestriction = partes[45] //
        let colorivel = partes[46] // Pode ser tingido
        let salesaagencyclass = partes[47] // Sales Agency Classification
        let efeitohabilidade = partes[48] //
        let ignorelevelcheckdrop = partes[49]
        let useperiod = partes[50]
        let gradeupcodekey = partes[51] //
        let gradeupresult = partes[52] //
        let decompositionid = partes[53] //
        let extractionid = partes[54] //
        let useleveloption = partes[55]
        let levelweight = partes[56] // n sei
        let overrisemax = partes[57] 
        let overriseid1 = partes[58] 
        let overriseid2 = partes[59] 
        let overriseid3 = partes[60]
        let contentslevel = partes[61]
        let channel = partes[62] // Integrated channel unusable
        let reverserestriction = partes[63] // reverse reinforcement restriction
        let levelup = partes[64] //
        let itemexp = partes[65] //
        let sealedstoneistwice = partes[66] // whether sealing stone is equipped twice
        let overrisematid1 = partes[67] //
        let ovverisematid2 = partes[68] //


        let itemTraduzido = mapaDeTraducoes[id] || {}; // Evita erro se não existir
        let nomeItem = itemTraduzido.nome || id;
        let descricaoItem = itemTraduzido.descricao || "Descrição não encontrada";

        if (descricaoItem == "Descrição não encontrada") {
            document.getElementById("description").style.display = "none";
            document.getElementById("itemdescription").style.display = "none";
        } else {
            document.getElementById("description").style.display = "block";
            document.getElementById("itemdescription").style.display = "block";

        }

        const coresRaridade = {
            1: "#ffffff", // Branco (Comum)
            2: "#00aaFF", // Azul (Elite)
            3: "#ffcc00", // Dourado (Heroico)
            4: "#ff00ff", // Roxo (Lendário)
            5: "#ff1155",  // Vermelho (Mítico)
            6: "#ffaa55"  // laranja (Unique)
        };
        let cor = coresRaridade[parseInt(grau)] || "#ffffff";

        let respostagrau;
        switch (parseInt(grau)) {
            case 1:
                respostagrau = "Common(Normal)";
                break;
            case 2:
                respostagrau = "Elite(Normal)";
                break;
            case 3:
                respostagrau = "Heroic(Normal)";
                break;
            case 4:
                respostagrau = "Legendary(Normal)";
                break;
            case 5:
                respostagrau = "Mythical(Normal)";
                break;
            case 6:
                respostagrau = "Unique(Normal)";
                break;
            default:
                respostagrau = grau; // Se não for um dos casos, mantém o valor original
        }

        let respostavinculacao;
        switch (vinculacao) {
            case "equip":
                respostavinculacao = "Bind on Equip";
                break;
            case "get":
                respostavinculacao = "Bind on Pickup";
                break;
            default:
                respostavinculacao = vinculacao;
        }
        function verificarClasses(classes) {
            let listaClasses = [];

            if (classes.includes("GD")) listaClasses.push("Guardião");
            if (classes.includes("WR")) listaClasses.push("Berserk");
            if (classes.includes("TF")) listaClasses.push("Trickster");
            if (classes.includes("AC")) listaClasses.push("Arqueiro");
            if (classes.includes("WZ")) listaClasses.push("Wizard");
            if (classes.includes("PR")) listaClasses.push("Priest");
            if (classes.includes("DO")) listaClasses.push("Assassin");
            if (classes.includes("MG")) listaClasses.push("Magician");

            // Se todas as classes estiverem na string, retorna "All Classes"
            if (listaClasses.length === 8) {
                return "All Classes";
            }

            return listaClasses.length > 0 ? listaClasses.join(" ") : "Error";
        }

        let respostatipoacc;
        switch (tipopart) {
            case "ja":
                respostatipoacc = "ja";
                break;
            case "ne":
                respostatipoacc = "Necklace";
                break;
            default:
                respostatipoacc = tipoacc;
        }
        
        if (parseInt(desvinculacao) == 0) {
            document.getElementById("unbinds").style.display = "block";
            document.getElementById("unbinds").style.display = "none";
        } else if (parseInt(disposed) == 0) {
            document.getElementById("unbinds").style.display = "block";
            document.getElementById("unbinds").style.display = "none";
        } else {
            document.getElementById("unbinds").style.display = "block";
            document.getElementById("unbinds").style.display = "none";
        }
/*          Reforco pelo visto não fica aqui
        if (parseInt(reforco) == 0) {
            document.getElementById("naopodemelhorar").style.display = "block";
            document.getElementById("temperinglevel").style.display = "none";
            document.getElementById("temperingname").style.display = "none";
        } else {
            document.getElementById("naopodemelhorar").style.display = "none";
            document.getElementById("temperinglevel").style.display = "inline";
            document.getElementById("temperingname").style.display = "block";
        }
*/              // Provissorio
        document.getElementById("temperinglevel").style.display = "none";
        document.getElementById("temperingname").style.display = "none";


        if (aplicacaoaleaatoriamax < 1) {
            document.getElementById("randomeffects").style.display = "none";
        } else {
            document.getElementById("randomeffects").style.display = "block";
        }

        switch (parseInt(efeitohabilidade)) {
            case 1:
                document.getElementById("temefeitos").style.display = "block";
                document.getElementById("oefeito").style.display = "block";
                break;
            default:
                document.getElementById("temefeitos").style.display = "none";
                document.getElementById("oefeito").style.display = "none";
        }

        if (sealstonesmax == 0) {
            document.getElementById("barraslots").style.display = "none";
            document.getElementById("selosslots").style.display = "none";
        } else {
            document.getElementById("barraslots").style.display = "block";
            document.getElementById("selosslots").style.display = "block";
        }

        // Converte para inteiro
        let preco = parseInt(precosell);
        let precoElemento = document.getElementById("itemPreco");
        let salePriceElemento = document.getElementById("saleprice");
        let barrasaleElemento = document.getElementById("barrasale");

        // Obtém as moedas
        let gold = Math.floor(preco / 10000);
        let silver = Math.floor((preco % 10000) / 100);
        let copper = preco % 100;
        // Define os ícones como imagens
        let goldIcon = '<img src="../imgs/goldcoin.png" class="moeda gold" />';
        let silverIcon = '<img src="../imgs/silvercoin.png" class="moeda silver" />';
        let copperIcon = '<img src="../imgs/coppercoin.png" class="moeda copper" />';


        // Array para armazenar as partes do preço
        let precoFormatado = [];

        switch (true) {
            case gold > 0:
                precoFormatado.push(`<span class="moeda gold">${gold}${goldIcon}</span>`);
            case silver > 0:
                precoFormatado.push(`<span class="moeda silver">${silver}${silverIcon}</span>`);
            case copper > 0:
                precoFormatado.push(`<span class="moeda copper">${copper}${copperIcon}</span>`);
        }

        // Exibir informações básicas
        document.getElementById("nomedoItemtraduzido").innerText = exibirLinhaOriginal(partes[0]);
        carregarIconeDoItem(id)
        document.getElementById("itemNome").innerText = nomeItem;
        document.getElementById("itemNivel").innerText = parseInt(nivelmin);
        document.getElementById("itemBindtype").innerText = respostavinculacao;
        document.getElementById("itemRaridade").innerText = respostagrau;
        document.getElementById("itemMagicDefense").innerText = parseInt(defesafisica) + " " + parseInt(defesamagica);
        document.getElementById("itemclasses").innerText = verificarClasses(classes);
        document.getElementById("tipoEquipamento").innerText = respostatipoacc;
        //document.getElementById("temperinglevel").innerText = parseInt(reforco);
        document.getElementById("unbinds").innerText = `Unbindings Available ${parseInt(desvinculacao)}/${parseInt(desvinculacao)}`;
        document.getElementById("oefeito").innerText = efeitohabilidade;
        document.getElementById("efeitosaleatoriosmin").innerText = parseInt(aplicacaoaleaatoriamin);
        document.getElementById("efeitosaleatoriosmax").innerText = parseInt(aplicacaoaleaatoriamax);
        document.getElementById("itemPreco").innerHTML = precoFormatado.join(" ");

        if (preco > 0) {
            precoElemento.innerHTML = precoFormatado.join(" ");
            salePriceElemento.style.display = "block"; // Exibe caso esteja oculto
            barrasaleElemento.style.display = "block"; // Exibe caso esteja oculto
        } else {
            salePriceElemento.style.display = "none"; // Oculta caso o preço seja 0
            barrasaleElemento.style.display = "none"; // Oculta caso o preço seja 0
        }

        document.getElementById("itemRaridade").style.color = cor;
        document.getElementById("itemNome").style.color = cor;
    } else {
        alert("Invalid code!, This code is for Armor");
    }
}

async function carregarEfeitos() {
    let resposta = await fetch(arquivoEfeitos);
    let texto = await resposta.text();
    let linhas = texto.split("\n");

    let mapaEfeitos = {};

    linhas.forEach(linha => {
        let partes = linha.split(",");
        if (partes.length === 2) {
            let chave = partes[0].trim();
            let traducao = partes[1].trim();
            mapaEfeitos[chave] = traducao;
        }
    });

    return mapaEfeitos;
}
let sera = itemPadrao.trim();
sera1 = sera.split(";");
console.log(sera1)
async function processarEfeitosDoItem() {
    let mapaEfeitos = await carregarEfeitos();
    let codigoBruto = document.getElementById("codigoItem").value.trim();

    if (!codigoBruto) return;

    let partes = codigoBruto.split(";");
    let efeitos = [partes[19], partes[20], partes[21], partes[22]]; // Efeitos do item

    efeitos.forEach((efeito, index) => {
        let elementoEfeito = document.getElementById(`itemEfeito${index + 1}`);

        if (!efeito || efeito.trim() === "*") {
            elementoEfeito.parentElement.style.display = "none";
            return;
        }

        let efeitoFormatado = efeito.replace(/[()]/g, "").split(",");
        let termoOriginal = efeitoFormatado[0].trim();
        let valorNumerico = efeitoFormatado[1] ? efeitoFormatado[1].trim() : null;

        let simbolo = termoOriginal.slice(-1);
        let termoBase = (simbolo === "%" || simbolo === "+") ? termoOriginal.slice(0, -1).trim() : termoOriginal.trim();

        let termoTraduzido = mapaEfeitos[termoBase] || termoBase;

        let efeitoFinal = termoTraduzido;

        if (valorNumerico !== null) {
            let numero = parseFloat(valorNumerico);
            if (simbolo === "%" && numero > 0) {
                efeitoFinal += ` +${numero}%`;
            } else if (simbolo === "%" && numero < 0) {
                efeitoFinal += ` ${numero}%`;
            } else if (simbolo === "+") {
                efeitoFinal += numero > 0 ? ` +${numero}` : ` ${numero}`;
            } else {
                efeitoFinal += ` ${numero}`;
            }
        }

        elementoEfeito.innerText = efeitoFinal;
        elementoEfeito.parentElement.style.display = "block";
    });
}

// ----------------- //
// Botões Principais //
// ----------------- //
function filtrarItems() {
    let input = document.getElementById("searchBar").value.toLowerCase();
    let buttons = document.querySelectorAll("#botaoContainer button");

    buttons.forEach(button => {
        let nome = button.querySelector("p").innerText.toLowerCase(); // Pega o nome do item
        button.style.display = nome.includes(input) ? "flex" : "none"; // Oculta ou exibe
    });
}

function mudarItem(index) {
    let item = itemArray[index]; // Acessa o item pelo índice

    if (!item) return; // Se não existir, sai da função

    document.getElementById("codigoItem").value = Object.values(item).join(";");
    
    atualizarItem();
    processarEfeitosDoItem();
}

function carregarCodigo() {
    atualizarItem()
    processarEfeitosDoItem()
}

function voltarCodigo() {
    document.getElementById("codigoItem").value = codigoOriginal;
    atualizarItem()
    processarEfeitosDoItem()
}

// Carrega Tudo que precisa ao inicia a pagina
async function inicializarPagina() {
    await carregarCSV();
    await carregarTraducoes();
    await carregarEfeitos();
    loadItems(arquivoButton, arquivoIcones, filtraTipo);

    // Espera os dados serem carregados antes de atualizar
    if (!itemArray || Object.keys(mapaDeTraducoes).length === 0) {
        console.warn("⚠️ Dados ainda não carregados. Tentando novamente em 100ms...");
        setTimeout(inicializarPagina, 100);
        return;
    }
    codigoOriginal = document.getElementById("codigoItem").value;
    atualizarItem();
    processarEfeitosDoItem();

}

window.onload = inicializarPagina;
