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
import { trpc } from "@/lib/trpc";

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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Usar tRPC para carregar dados
  const { data: dashboardData, refetch: refetchData } = trpc.dashboard.getData.useQuery(undefined, {
    refetchInterval: 5000, // Sincronizar a cada 5 segundos
  });

  // Usar tRPC para salvar dados
  const saveDataMutation = trpc.dashboard.saveData.useMutation({
    onSuccess: () => {
      console.log("✅ Dados salvos com sucesso via tRPC!");
      refetchData();
    },
    onError: (error) => {
      console.error("❌ Erro ao salvar dados:", error);
      toast.error("Erro ao salvar dados no servidor");
    },
  });

  // Atualizar estado quando dados chegam do servidor
  useEffect(() => {
    if (dashboardData) {
      console.log("📊 Dados recebidos do servidor:", { total_itens: dashboardData.total_itens });
      setData(dashboardData);
      setFilteredData(dashboardData.data_preview || []);
      setLoading(false);
    }
  }, [dashboardData]);

  const determinarStatus = (duracao: number): string => {
    if (duracao <= 0) return "🔴 CRÍTICO";
    if (duracao <= 5) return "🟡 ATENÇÃO";
    return "🟢 OK";
  };

  const converterDataExcel = (valor: any): string => {
    if (typeof valor === "number") {
      const dataExcel = new Date((valor - 25569) * 86400 * 1000);
      const dia = String(dataExcel.getDate()).padStart(2, "0");
      const mes = String(dataExcel.getMonth() + 1).padStart(2, "0");
      const ano = dataExcel.getFullYear();
      return `${dia}/${mes}/${ano}`;
    }
    if (typeof valor === "string") {
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
        return valor;
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
        const [ano, mes, dia] = valor.split("-");
        return `${dia}/${mes}/${ano}`;
      }
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
      console.log("📊 Dados lidos do Excel:", { total_linhas: jsonData.length, primeira_linha: jsonData[0] });

      // Processar dados do Excel
      const processedData: DataItem[] = jsonData.map((item: any) => {
        const saldo = Number(item["SALDO EM ESTOQUE"] || item["Estoque"] || 0);
        const consumo = Number(item["CONSUMO MEDIO MENSAL"] || item["Consumo"] || 0);
        
        // Recalcular duração em dias: (saldo / (consumo / 30))
        let duracao = 0;
        if (consumo > 0) {
          duracao = Math.round((saldo / (consumo / 30)));
        }
        
        return {
          CODIGO: Number(item["CODIGO"] || item["Código"] || 0),
          "DESCRIÇÃO DO ITEM": String(item["DESCRIÇÃO DO ITEM"] || item["Descrição"] || ""),
          "SALDO EM ESTOQUE": saldo,
          "CONSUMO MEDIO MENSAL": consumo,
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

      console.log("📤 Enviando dados para o servidor via tRPC...", { total_itens: newData.total_itens });
      
      // Usar tRPC para salvar
      await saveDataMutation.mutateAsync(newData);
      
      setSelectedCategory("Todos");
      setSearchTerm("");
      toast.success(`✅ Dados carregados e salvos! ${totalItens} itens processados.`);
      toast.info("📡 Sincronizando com outros usuários...");
    } catch (error) {
      console.error("Erro ao processar Excel:", error);
      toast.error("Erro ao processar arquivo Excel");
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
      filtered = filtered.filter((item) => item.Coluna1.includes("🔴"));
    } else if (category === "Atenção") {
      filtered = filtered.filter((item) => item.Coluna1.includes("🟡"));
    } else if (category === "OK") {
      filtered = filtered.filter((item) => item.Coluna1.includes("🟢"));
    }

    setFilteredData(filtered);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!data) return;

    let filtered = data.data_preview;

    if (selectedCategory === "Críticos") {
      filtered = filtered.filter((item) => item.Coluna1.includes("🔴"));
    } else if (selectedCategory === "Atenção") {
      filtered = filtered.filter((item) => item.Coluna1.includes("🟡"));
    } else if (selectedCategory === "OK") {
      filtered = filtered.filter((item) => item.Coluna1.includes("🟢"));
    }

    if (term) {
      filtered = filtered.filter(
        (item) =>
          item["DESCRIÇÃO DO ITEM"].toLowerCase().includes(term.toLowerCase()) ||
          item.CODIGO.toString().includes(term)
      );
    }

    setFilteredData(filtered);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando dados...</div>;
  }

  if (!data) {
    return <div className="flex items-center justify-center h-screen">Nenhum dado disponível</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Package className="w-8 h-8" />
              Dashboard de Estoque
            </h1>
            <div className="flex items-center gap-4 mt-4">
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
          <Card className="p-6 bg-card text-card-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total de Itens</p>
                <p className="text-3xl font-bold text-blue-500">{data.total_itens}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6 bg-card text-card-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Comprar Primeiro</p>
                <p className="text-lg font-bold text-blue-500">
                  {data.itens_atencao[0] || "N/A"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.status_counts["🟡 ATENÇÃO"]} dias
                </p>
              </div>
              <ShoppingCart className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6 bg-card text-card-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Menor Estoque</p>
                <p className="text-lg font-bold text-orange-500">
                  {data.data_preview.reduce((min, item) =>
                    item["SALDO EM ESTOQUE"] < min["SALDO EM ESTOQUE"] ? item : min
                  )["DESCRIÇÃO DO ITEM"]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.data_preview.reduce((min, item) =>
                    item["SALDO EM ESTOQUE"] < min["SALDO EM ESTOQUE"] ? item : min
                  )["SALDO EM ESTOQUE"]}{" "}
                  un
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-500" />
            </div>
          </Card>

          <Card className="p-6 bg-card text-card-foreground">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Maior Estoque</p>
                <p className="text-lg font-bold text-green-500">
                  {data.data_preview.reduce((max, item) =>
                    item["SALDO EM ESTOQUE"] > max["SALDO EM ESTOQUE"] ? item : max
                  )["DESCRIÇÃO DO ITEM"]}
                </p>
                <p className="text-xs text-muted-foreground">
                  {data.data_preview.reduce((max, item) =>
                    item["SALDO EM ESTOQUE"] > max["SALDO EM ESTOQUE"] ? item : max
                  )["SALDO EM ESTOQUE"]}{" "}
                  un
                </p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <Card className="p-6 bg-card text-card-foreground border-l-4 border-l-red-500">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-muted-foreground text-sm">Itens Críticos</p>
                <p className="text-3xl font-bold text-red-500">{data.status_counts["🔴 CRÍTICO"]}</p>
                <p className="text-xs text-muted-foreground mt-1">Clique para filtrar</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card text-card-foreground border-l-4 border-l-yellow-500">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-muted-foreground text-sm">Itens com Atenção</p>
                <p className="text-3xl font-bold text-yellow-500">{data.status_counts["🟡 ATENÇÃO"]}</p>
                <p className="text-xs text-muted-foreground mt-1">Clique para filtrar</p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-card text-card-foreground border-l-4 border-l-green-500">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-muted-foreground text-sm">Itens OK</p>
                <p className="text-3xl font-bold text-green-500">{data.status_counts["🟢 OK"]}</p>
                <p className="text-xs text-muted-foreground mt-1">88% do inventário</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-6 bg-card text-card-foreground">
          <h2 className="text-xl font-bold mb-4">Detalhamento de Itens</h2>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar por nome ou código..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
            />
          </div>
          <Tabs defaultValue="Todos" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="Todos" onClick={() => handleCategoryFilter("Todos")}>
                Todos ({data.total_itens})
              </TabsTrigger>
              <TabsTrigger value="Críticos" onClick={() => handleCategoryFilter("Críticos")}>
                Críticos ({data.status_counts["🔴 CRÍTICO"]})
              </TabsTrigger>
              <TabsTrigger value="Atenção" onClick={() => handleCategoryFilter("Atenção")}>
                Atenção ({data.status_counts["🟡 ATENÇÃO"]})
              </TabsTrigger>
              <TabsTrigger value="OK" onClick={() => handleCategoryFilter("OK")}>
                OK ({data.status_counts["🟢 OK"]})
              </TabsTrigger>
            </TabsList>
            <TabsContent value={selectedCategory} className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Código</th>
                      <th className="px-4 py-2 text-left">Descrição</th>
                      <th className="px-4 py-2 text-right">Estoque</th>
                      <th className="px-4 py-2 text-right">Consumo/mês</th>
                      <th className="px-4 py-2 text-right">Lead Time</th>
                      <th className="px-4 py-2 text-right">Duração (dias)</th>
                      <th className="px-4 py-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((item, idx) => (
                      <tr key={idx} className="border-b border-border hover:bg-muted">
                        <td className="px-4 py-2">{item.CODIGO}</td>
                        <td className="px-4 py-2">{item["DESCRIÇÃO DO ITEM"]}</td>
                        <td className="px-4 py-2 text-right">{item["SALDO EM ESTOQUE"]}</td>
                        <td className="px-4 py-2 text-right">{item["CONSUMO MEDIO MENSAL"]}</td>
                        <td className="px-4 py-2 text-right">{item["LEAD TIME"]}</td>
                        <td className="px-4 py-2 text-right font-bold">{item["DURAÇÃO EM DIAS"]}</td>
                        <td className="px-4 py-2 text-center">{item.Coluna1}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </main>
    </div>
  );
}
