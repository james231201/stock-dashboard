import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Package,
  ShoppingCart,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";

interface DataItem {
  CODIGO: number;
  "DESCRIÇÃO DO ITEM": string;
  "SALDO EM ESTOQUE": number;
  "CONSUMO MEDIO MENSAL": number;
  "LEAD TIME": number;
  "DURAÇÃO EM DIAS": number;
  "DATA LIMITE DE SOLICITAÇÃO ": string;
  Coluna1: string;
}

interface DashboardData {
  total_itens: number;
  estoque_total: number;
  consumo_total: number;
  status_counts: Record<string, number>;
  itens_criticos: string[];
  itens_atencao: string[];
  media_duracao: number;
  data_preview: DataItem[];
}

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [filteredData, setFilteredData] = useState<DataItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("Todos");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadDefaultData();
  }, []);

  const loadDefaultData = async () => {
    try {
      // Carregar dados do servidor via API (não do arquivo estático)
      const response = await fetch('/api/trpc/dashboard.getData?batch=true', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const result = await response.json();
        // tRPC retorna um array com resultado
        const data = result[0]?.result?.data || result[0]?.data;
        if (data) {
          setData(data);
          setFilteredData(data.data_preview || []);
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setIsLoading(false);
      toast.error('Erro ao carregar dados iniciais');
    }
  };

  // Recarregar dados a cada 5 segundos para sincronizar com outros usuários
  useEffect(() => {
    loadDefaultData();
    
    const interval = setInterval(() => {
      loadDefaultData();
    }, 5000); // Sincronizar a cada 5 segundos

    return () => clearInterval(interval);
  }, []);

    // Recarregar dados a cada 5 segundos para sincronizar com outros usuários
  useEffect(() => {
    const interval = setInterval(() => {
      // Adicionar timestamp para evitar cache
      const timestamp = new Date().getTime();
      fetch(`/data.json?t=${timestamp}`)
        .then((res) => res.json())
        .then((json: DashboardData) => {
          setData(json);
          setFilteredData(json.data_preview);
        })
        .catch((error) => {
          console.error("Erro ao sincronizar dados", error);
        });
    }, 5000); // Sincronizar a cada 5 segundos

    return () => clearInterval(interval);
  }, []);

  const determinarStatus = (duracao: number): string => {
    if (duracao <= 0) return "🔴 CRÍTICO";
    if (duracao <= 5) return "🟡 ATENÇÃO";
    return "🟢 OK";
  };

  const converterDataExcel = (valor: any): string => {
    // Se for número (formato Excel), converter para data
    if (typeof valor === "number") {
      const dataExcel = new Date((valor - 25569) * 86400 * 1000);
      const dia = String(dataExcel.getDate()).padStart(2, "0");
      const mes = String(dataExcel.getMonth() + 1).padStart(2, "0");
      const ano = dataExcel.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
    // Se for string, tentar converter
    if (typeof valor === "string") {
      // Se já está em formato DD/MM/YYYY, retornar como está
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
        return valor;
      }
      // Se está em formato YYYY-MM-DD, converter
      if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [ano, mes, dia] = valor.split("-");
        return `${dia}/${mes}/${ano}`;
      }
      // Se está em formato DD-MM-YYYY, converter
      if (/^\d{2}-\d{2}-\d{4}$/.test(valor)) {
        const [dia, mes, ano] = valor.split("-");
        return `${dia}/${mes}/${ano}`;
      }
    }
    return String(valor || "");
  };

  const processarExcel = async (file: File) => {
    try {
      setUploading(true);
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Processar dados do Excel
      const processedData: DataItem[] = jsonData.map((item: any) => {
        const duracao = Number(item["DURAÇÃO EM DIAS"] || item["Duração"] || 0);
        return {
          CODIGO: Number(item["CODIGO"] || item["Código"] || 0),
          "DESCRIÇÃO DO ITEM": String(item["DESCRIÇÃO DO ITEM"] || item["Descrição"] || ""),
          "SALDO EM ESTOQUE": Number(item["SALDO EM ESTOQUE"] || item["Estoque"] || 0),
          "CONSUMO MEDIO MENSAL": Number(item["CONSUMO MEDIO MENSAL"] || item["Consumo"] || 0),
          "LEAD TIME": Number(item["LEAD TIME"] || item["Lead Time"] || 0),
          "DURAÇÃO EM DIAS": duracao,
          "DATA LIMITE DE SOLICITAÇÃO ": converterDataExcel(
            item["DATA LIMITE DE SOLICITAÇÃO "] || item["DATA LIMITE DE SOLICITAÇÃO"] || item["Data Solicitação"] || ""
          ),
          Coluna1: determinarStatus(duracao),
        };
      });

      // Calcular métricas
      const totalItens = processedData.length;
      const estoqueTotal = processedData.reduce((sum, item) => sum + item["SALDO EM ESTOQUE"], 0);
      const consumoTotal = processedData.reduce((sum, item) => sum + item["CONSUMO MEDIO MENSAL"], 0);
      const mediaDuracao = processedData.reduce((sum, item) => sum + item["DURAÇÃO EM DIAS"], 0) / totalItens;

      const statusCounts: Record<string, number> = {
        "🔴 CRÍTICO": processedData.filter((item) => item.Coluna1.includes("🔴")).length,
        "🟡 ATENÇÃO": processedData.filter((item) => item.Coluna1.includes("🟡")).length,
        "🟢 OK": processedData.filter((item) => item.Coluna1.includes("🟢")).length,
      };

      const itensCriticos = processedData
        .filter((item) => item.Coluna1.includes("🔴"))
        .map((item) => item["DESCRIÇÃO DO ITEM"]);

      const itensAtencao = processedData
        .filter((item) => item.Coluna1.includes("🟡"))
        .map((item) => item["DESCRIÇÃO DO ITEM"]);

      const newData: DashboardData = {
        total_itens: totalItens,
        estoque_total: estoqueTotal,
        consumo_total: consumoTotal,
        status_counts: statusCounts,
        itens_criticos: itensCriticos,
        itens_atencao: itensAtencao,
        media_duracao: Math.round(mediaDuracao * 10) / 10,
        data_preview: processedData,
      };

      // Não salvar no LocalStorage - sempre usar dados do servidor

      // Salvar no servidor (data.json)
      try {
        console.log("📤 Enviando dados para o servidor...", { total_itens: newData.total_itens });
        const response = await fetch("/api/trpc/dashboard.saveData", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            json: newData,
          }),
          credentials: "include",
        });
        
        const responseText = await response.text();
        console.log("📥 Resposta do servidor:", response.status, responseText);
        
        if (response.ok) {
          console.log("✅ Dados salvos no servidor com sucesso!");
        } else {
          console.error("❌ Erro ao salvar dados:", response.status, responseText);
          toast.error(`Erro ao salvar: ${response.status}`);
        }
      } catch (error) {
        console.error("❌ Erro na requisição:", error);
        toast.error("Erro ao salvar dados no servidor");
      }

      // Recarregar dados do servidor para sincronizar
      setTimeout(() => {
        loadDefaultData();
      }, 500);
      
      setSelectedCategory("Todos");
      setSearchTerm("");
      toast.success(`✅ Dados carregados e salvos! ${totalItens} itens processados.`);
      toast.info("📡 Sincronizando com outros usuários...");
    } catch (error) {
      console.error("Erro ao processar Excel:", error);
      toast.error("❌ Erro ao processar arquivo Excel. Verifique o formato.");
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Por favor, selecione um arquivo Excel (.xlsx ou .xls)");
        return;
      }
      processarExcel(file);
    }
  };

  const handleCategoryFilter = (category: string) => {
    setSelectedCategory(category);
    setSearchTerm("");
    if (!data) return;

    let filtered = data.data_preview;

    if (category === "Críticos") {
      filtered = data.data_preview.filter((item) => item.Coluna1.includes("🔴"));
    } else if (category === "Atenção") {
      filtered = data.data_preview.filter((item) => item.Coluna1.includes("🟡"));
    } else if (category === "OK") {
      filtered = data.data_preview.filter((item) => item.Coluna1.includes("🟢"));
    }

    setFilteredData(filtered);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!data) return;

    let filtered = data.data_preview;

    if (selectedCategory === "Críticos") {
      filtered = data.data_preview.filter((item) => item.Coluna1.includes("🔴"));
    } else if (selectedCategory === "Atenção") {
      filtered = data.data_preview.filter((item) => item.Coluna1.includes("🟡"));
    } else if (selectedCategory === "OK") {
      filtered = data.data_preview.filter((item) => item.Coluna1.includes("🟢"));
    }

    if (term.trim() !== "") {
      filtered = filtered.filter(
        (item) =>
          item.CODIGO.toString().includes(term) ||
          item["DESCRIÇÃO DO ITEM"].toLowerCase().includes(term.toLowerCase())
      );
    }

    setFilteredData(filtered);
  };

  const itemComprarPrimeiro = data
    ? data.data_preview.reduce((prev, current) =>
        prev["DURAÇÃO EM DIAS"] < current["DURAÇÃO EM DIAS"] ? prev : current
      )
    : null;

  const itemMenorEstoque = data
    ? data.data_preview.reduce((prev, current) =>
        prev["SALDO EM ESTOQUE"] < current["SALDO EM ESTOQUE"] ? prev : current
      )
    : null;

  const itemMaiorEstoque = data
    ? data.data_preview.reduce((prev, current) =>
        prev["SALDO EM ESTOQUE"] > current["SALDO EM ESTOQUE"] ? prev : current
      )
    : null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-lg">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-accent" />
              <h1 className="text-3xl font-bold">Dashboard de Estoque</h1>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
                id="excel-upload"
              />
              <label htmlFor="excel-upload">
                <Button
                  asChild
                  disabled={uploading}
                  className="cursor-pointer"
                  variant="outline"
                >
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {uploading ? "Carregando..." : "Carregar Excel"}
                  </span>
                </Button>
              </label>
            </div>
          </div>
          <p className="text-muted-foreground">
            Análise dinâmica de inventário e indicadores de reposição
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card
            className="bg-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              handleCategoryFilter("Todos");
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Total de Itens
                </p>
                <p className="text-3xl font-bold text-accent mt-2">
                  {data?.total_itens}
                </p>
              </div>
              <Package className="w-8 h-8 text-accent/60" />
            </div>
          </Card>

          <Card
            className="bg-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              if (itemComprarPrimeiro) {
                handleCategoryFilter("Todos");
                setTimeout(() => {
                  const element = document.getElementById(
                    `item-${itemComprarPrimeiro.CODIGO}`
                  );
                  element?.scrollIntoView({ behavior: "smooth", block: "center" });
                  element?.classList.add("bg-accent/20");
                }, 100);
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Comprar Primeiro
                </p>
                <p className="text-sm font-semibold text-accent mt-2 line-clamp-2">
                  {itemComprarPrimeiro?.["DESCRIÇÃO DO ITEM"]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {itemComprarPrimeiro?.["DURAÇÃO EM DIAS"]} dias
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-accent/60" />
            </div>
          </Card>

          <Card
            className="bg-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              if (itemMenorEstoque) {
                handleCategoryFilter("Todos");
                setTimeout(() => {
                  const element = document.getElementById(
                    `item-${itemMenorEstoque.CODIGO}`
                  );
                  element?.scrollIntoView({ behavior: "smooth", block: "center" });
                  element?.classList.add("bg-accent/20");
                }, 100);
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Menor Estoque
                </p>
                <p className="text-sm font-semibold text-accent mt-2 line-clamp-2">
                  {itemMenorEstoque?.["DESCRIÇÃO DO ITEM"]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {itemMenorEstoque?.["SALDO EM ESTOQUE"]} un
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-accent/60" />
            </div>
          </Card>

          <Card
            className="bg-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              if (itemMaiorEstoque) {
                handleCategoryFilter("Todos");
                setTimeout(() => {
                  const element = document.getElementById(
                    `item-${itemMaiorEstoque.CODIGO}`
                  );
                  element?.scrollIntoView({ behavior: "smooth", block: "center" });
                  element?.classList.add("bg-accent/20");
                }, 100);
              }
            }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Maior Estoque
                </p>
                <p className="text-sm font-semibold text-accent mt-2 line-clamp-2">
                  {itemMaiorEstoque?.["DESCRIÇÃO DO ITEM"]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {itemMaiorEstoque?.["SALDO EM ESTOQUE"]} un
                </p>
              </div>
              <Package className="w-8 h-8 text-accent/60" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <Card
            className="bg-card border-border p-6 border-l-4 border-l-red-500 cursor-pointer hover:bg-card/80 transition-colors"
            onClick={() => handleCategoryFilter("Críticos")}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-muted-foreground text-sm font-medium">
                  Itens Críticos
                </p>
                <p className="text-2xl font-bold text-red-500 mt-1">
                  {data?.itens_criticos.length || 0}
                </p>
                {data?.itens_criticos.length! > 0 && (
                  <ul className="mt-3 space-y-1">
                    {data?.itens_criticos.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-muted-foreground truncate"
                      >
                        • {item}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground mt-3 italic">
                  Clique para filtrar
                </p>
              </div>
            </div>
          </Card>

          <Card
            className="bg-card border-border p-6 border-l-4 border-l-yellow-500 cursor-pointer hover:bg-card/80 transition-colors"
            onClick={() => handleCategoryFilter("Atenção")}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-muted-foreground text-sm font-medium">
                  Itens com Atenção
                </p>
                <p className="text-2xl font-bold text-yellow-500 mt-1">
                  {data?.itens_atencao.length || 0}
                </p>
                {data?.itens_atencao.length! > 0 && (
                  <ul className="mt-3 space-y-1">
                    {data?.itens_atencao.slice(0, 2).map((item, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-muted-foreground truncate"
                      >
                        • {item}
                      </li>
                    ))}
                    {data?.itens_atencao.length! > 2 && (
                      <li className="text-xs text-muted-foreground">
                        +{data?.itens_atencao.length! - 2} mais
                      </li>
                    )}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground mt-3 italic">
                  Clique para filtrar
                </p>
              </div>
            </div>
          </Card>

          <Card
            className="bg-card border-border p-6 border-l-4 border-l-green-500 cursor-pointer hover:bg-card/80 transition-colors"
            onClick={() => handleCategoryFilter("OK")}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-muted-foreground text-sm font-medium">
                  Itens OK
                </p>
                <p className="text-2xl font-bold text-green-500 mt-1">
                  {data?.status_counts["🟢 OK"] || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  {data && data.total_itens > 0
                    ? Math.round(
                        ((data.status_counts["🟢 OK"] || 0) / data.total_itens) * 100
                      )
                    : 0}
                  % do inventário
                </p>
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Clique para filtrar
                </p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="bg-card border-border p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Detalhamento de Itens</h2>

            <div className="mb-4">
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full px-4 py-2 bg-secondary/50 border border-border rounded-md text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent transition-all"
              />
            </div>

            <Tabs value={selectedCategory} onValueChange={handleCategoryFilter} className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="Todos">
                  Todos ({data?.total_itens || 0})
                </TabsTrigger>
                <TabsTrigger value="Críticos">
                  Críticos ({data?.status_counts["🔴 CRÍTICO"] || 0})
                </TabsTrigger>
                <TabsTrigger value="Atenção">
                  Atenção ({data?.status_counts["🟡 ATENÇÃO"] || 0})
                </TabsTrigger>
                <TabsTrigger value="OK">
                  OK ({data?.status_counts["🟢 OK"] || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-border">
                      <tr>
                        <th className="text-left py-3 px-4 font-semibold">
                          Código
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Descrição
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Estoque
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Consumo/Mês
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Lead Time
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Duração
                        </th>
                        <th className="text-left py-3 px-4 font-semibold">
                          Solicitação de Compras
                        </th>
                        <th className="text-center py-3 px-4 font-semibold">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredData.map((item) => (
                        <tr
                          key={item.CODIGO}
                          id={`item-${item.CODIGO}`}
                          className="hover:bg-secondary/30 transition-colors"
                        >
                          <td className="py-3 px-4 text-sm font-mono">
                            {item.CODIGO}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {item["DESCRIÇÃO DO ITEM"]}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {item["SALDO EM ESTOQUE"]}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {item["CONSUMO MEDIO MENSAL"]}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {item["LEAD TIME"]} dias
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span
                              className={
                                item["DURAÇÃO EM DIAS"] <= 5
                                  ? "text-red-400 font-semibold"
                                  : item["DURAÇÃO EM DIAS"] <= 15
                                  ? "text-yellow-400 font-semibold"
                                  : "text-green-400 font-semibold"
                              }
                            >
                              {item["DURAÇÃO EM DIAS"]} dias
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {item["DATA LIMITE DE SOLICITAÇÃO "]}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-lg">{item.Coluna1}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-4">
                  {searchTerm.trim() !== "" 
                    ? `Mostrando ${filteredData.length} resultado(s) para "${searchTerm}"`
                    : `Mostrando ${filteredData.length} de ${data?.total_itens} itens`
                  }
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </main>
    </div>
  );
}
