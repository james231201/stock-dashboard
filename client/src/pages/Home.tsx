import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Package,
  ShoppingCart,
} from "lucide-react";

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

  useEffect(() => {
    fetch("/data.json")
      .then((res) => res.json())
      .then((json: DashboardData) => {
        setData(json);
        setFilteredData(json.data_preview);
        setLoading(false);
      });
  }, []);

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

  const consumoData = data
    ? data.data_preview.map((item) => {
        const estoque = item["SALDO EM ESTOQUE"];
        const consumo = item["CONSUMO MEDIO MENSAL"];
        
        const estoqueRepresentativo = Math.sqrt(estoque) * 15;
        const consumoRepresentativo = Math.sqrt(consumo) * 15;
        
        return {
          nome: item["DESCRIÇÃO DO ITEM"].substring(0, 15),
          estoque: estoqueRepresentativo,
          consumo: consumoRepresentativo,
          estoqueReal: estoque,
          consumoReal: consumo,
        };
      })
    : [];

  const formatarDataPtBR = (dataString: string) => {
    const [ano, mes, dia] = dataString.split("-");
    return `${dia}/${mes}/${ano}`;
  };



  if (loading) {
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
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold">Dashboard de Estoque</h1>
          </div>
          <p className="text-muted-foreground">
            Análise dinâmica de inventário e indicadores de reposição
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              handleCategoryFilter("Todos");
            }}>
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

          <Card className="bg-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              if (itemComprarPrimeiro) {
                handleCategoryFilter("Todos");
                setTimeout(() => {
                  const element = document.getElementById(`item-${itemComprarPrimeiro.CODIGO}`);
                  element?.scrollIntoView({ behavior: "smooth", block: "center" });
                  element?.classList.add("bg-accent/20");
                }, 100);
              }
            }}>
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

          <Card className="bg-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              if (itemMenorEstoque) {
                handleCategoryFilter("Todos");
                setTimeout(() => {
                  const element = document.getElementById(`item-${itemMenorEstoque.CODIGO}`);
                  element?.scrollIntoView({ behavior: "smooth", block: "center" });
                  element?.classList.add("bg-accent/20");
                }, 100);
              }
            }}>
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

          <Card className="bg-card border-border p-6 hover:border-accent/50 transition-colors cursor-pointer"
            onClick={() => {
              if (itemMaiorEstoque) {
                handleCategoryFilter("Todos");
                setTimeout(() => {
                  const element = document.getElementById(`item-${itemMaiorEstoque.CODIGO}`);
                  element?.scrollIntoView({ behavior: "smooth", block: "center" });
                  element?.classList.add("bg-accent/20");
                }, 100);
              }
            }}>
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
                <p className="text-xs text-muted-foreground mt-2 italic">
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
                      <li className="text-xs text-muted-foreground italic">
                        +{data?.itens_atencao.length! - 2} mais
                      </li>
                    )}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground mt-2 italic">
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
                  {data && data.total_itens > 0 ? Math.round((data.status_counts["🟢 OK"] || 0) / data.total_itens * 100) : 0}% do inventário
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

            <Tabs defaultValue="Todos" className="w-full">
              <TabsList className="bg-secondary/50 border border-border">
                <TabsTrigger
                  value="Todos"
                  onClick={() => handleCategoryFilter("Todos")}
                >
                  Todos ({data?.total_itens})
                </TabsTrigger>
                <TabsTrigger
                  value="Críticos"
                  onClick={() => handleCategoryFilter("Críticos")}
                >
                  Críticos ({data?.itens_criticos.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="Atenção"
                  onClick={() => handleCategoryFilter("Atenção")}
                >
                  Atenção ({data?.itens_atencao.length || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="OK"
                  onClick={() => handleCategoryFilter("OK")}
                >
                  OK ({data?.status_counts["OK"] || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="Todos" className="mt-4">
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
                          Data Solicitação
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
                            {formatarDataPtBR(item["DATA LIMITE DE SOLICITAÇÃO "])}
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
