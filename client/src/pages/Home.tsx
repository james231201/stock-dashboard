import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  Package,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

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
    if (!data) return;

    if (category === "Todos") {
      setFilteredData(data.data_preview);
    } else if (category === "Críticos") {
      setFilteredData(
        data.data_preview.filter((item) => item.Coluna1.includes("🔴"))
      );
    } else if (category === "Atenção") {
      setFilteredData(
        data.data_preview.filter((item) => item.Coluna1.includes("🟡"))
      );
    } else if (category === "OK") {
      setFilteredData(
        data.data_preview.filter((item) => item.Coluna1.includes("🟢"))
      );
    }
  };

  // Preparar dados para gráficos
  const statusChartData = data
    ? [
        {
          name: "OK",
          value: data.status_counts["🟢 OK"] || 0,
          fill: "#10B981",
        },
        {
          name: "Atenção",
          value: data.status_counts["🟡 ATENÇÃO"] || 0,
          fill: "#F59E0B",
        },
        {
          name: "Crítico",
          value: data.status_counts["🔴 CRÍTICO"] || 0,
          fill: "#EF4444",
        },
      ]
    : [];

  // Dados de consumo vs estoque
  const consumoData = data
    ? data.data_preview
        .slice(0, 8)
        .map((item) => ({
          nome: item["DESCRIÇÃO DO ITEM"].substring(0, 15),
          estoque: item["SALDO EM ESTOQUE"],
          consumo: item["CONSUMO MEDIO MENSAL"],
        }))
    : [];

  // Dados de duração
  const duracaoData = data
    ? data.data_preview
        .slice(0, 8)
        .map((item) => ({
          nome: item["DESCRIÇÃO DO ITEM"].substring(0, 15),
          dias: item["DURAÇÃO EM DIAS"],
        }))
    : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-lg">Carregando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Items */}
          <Card className="bg-card border-border p-6 hover:border-accent/50 transition-colors">
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

          {/* Total Stock */}
          <Card className="bg-card border-border p-6 hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Estoque Total
                </p>
                <p className="text-3xl font-bold text-accent mt-2">
                  {data?.estoque_total.toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-accent/60" />
            </div>
          </Card>

          {/* Monthly Consumption */}
          <Card className="bg-card border-border p-6 hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Consumo Mensal
                </p>
                <p className="text-3xl font-bold text-accent mt-2">
                  {data?.consumo_total.toLocaleString("pt-BR", {
                    maximumFractionDigits: 0,
                  })}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-accent/60" />
            </div>
          </Card>

          {/* Average Duration */}
          <Card className="bg-card border-border p-6 hover:border-accent/50 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">
                  Duração Média
                </p>
                <p className="text-3xl font-bold text-accent mt-2">
                  {data?.media_duracao.toFixed(1)} dias
                </p>
              </div>
              <Clock className="w-8 h-8 text-accent/60" />
            </div>
          </Card>
        </div>

        {/* Status Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          {/* Critical Items */}
          <Card className="bg-card border-border p-6 border-l-4 border-l-red-500">
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
              </div>
            </div>
          </Card>

          {/* Attention Items */}
          <Card className="bg-card border-border p-6 border-l-4 border-l-amber-500">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <p className="text-muted-foreground text-sm font-medium">
                  Itens com Atenção
                </p>
                <p className="text-2xl font-bold text-amber-500 mt-1">
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
              </div>
            </div>
          </Card>

          {/* OK Items */}
          <Card className="bg-card border-border p-6 border-l-4 border-l-green-500">
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
                  {(
                    ((data?.status_counts["🟢 OK"] || 0) /
                      (data?.total_itens || 1)) *
                    100
                  ).toFixed(0)}
                  % do inventário
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution */}
          <Card className="bg-card border-border p-6">
            <h2 className="text-lg font-semibold mb-4">Distribuição de Status</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Consumption vs Stock */}
          <Card className="bg-card border-border p-6">
            <h2 className="text-lg font-semibold mb-4">
              Consumo vs Estoque (Top 8)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consumoData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.1)"
                />
                <XAxis dataKey="nome" stroke="currentColor" fontSize={12} />
                <YAxis stroke="currentColor" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                  }}
                />
                <Legend />
                <Bar dataKey="estoque" fill="#3B82F6" name="Estoque" />
                <Bar dataKey="consumo" fill="#F59E0B" name="Consumo" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Duration Chart */}
        <Card className="bg-card border-border p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Duração do Estoque (Top 8)</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={duracaoData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.1)"
              />
              <XAxis dataKey="nome" stroke="currentColor" fontSize={12} />
              <YAxis stroke="currentColor" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.9)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              />
              <Line
                type="monotone"
                dataKey="dias"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: "#10B981", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Data Table with Filters */}
        <Card className="bg-card border-border p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-4">Detalhamento de Itens</h2>
            <Tabs defaultValue="Todos" className="w-full">
              <TabsList className="bg-secondary/50 border border-border">
                <TabsTrigger
                  value="Todos"
                  onClick={() => handleCategoryFilter("Todos")}
                  className="data-[state=active]:bg-accent data-[state=active]:text-accent-foreground"
                >
                  Todos ({data?.total_itens})
                </TabsTrigger>
                <TabsTrigger
                  value="OK"
                  onClick={() => handleCategoryFilter("OK")}
                  className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
                >
                  OK ({data?.status_counts["🟢 OK"] || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="Atenção"
                  onClick={() => handleCategoryFilter("Atenção")}
                  className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
                >
                  Atenção ({data?.status_counts["🟡 ATENÇÃO"] || 0})
                </TabsTrigger>
                <TabsTrigger
                  value="Críticos"
                  onClick={() => handleCategoryFilter("Críticos")}
                  className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"
                >
                  Críticos ({data?.status_counts["🔴 CRÍTICO"] || 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={selectedCategory} className="mt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                          Código
                        </th>
                        <th className="text-left py-3 px-4 font-semibold text-muted-foreground">
                          Descrição
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                          Estoque
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                          Consumo/Mês
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                          Lead Time
                        </th>
                        <th className="text-right py-3 px-4 font-semibold text-muted-foreground">
                          Duração
                        </th>
                        <th className="text-center py-3 px-4 font-semibold text-muted-foreground">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-border/50 hover:bg-secondary/30 transition-colors"
                        >
                          <td className="py-3 px-4 font-mono text-xs">
                            {item.CODIGO}
                          </td>
                          <td className="py-3 px-4 text-foreground/90">
                            {item["DESCRIÇÃO DO ITEM"]}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold">
                            {item["SALDO EM ESTOQUE"].toLocaleString("pt-BR", {
                              maximumFractionDigits: 1,
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item["CONSUMO MEDIO MENSAL"].toLocaleString(
                              "pt-BR",
                              { maximumFractionDigits: 0 }
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {item["LEAD TIME"]} dias
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span
                              className={
                                item["DURAÇÃO EM DIAS"] <= 7
                                  ? "text-red-400 font-semibold"
                                  : item["DURAÇÃO EM DIAS"] <= 30
                                    ? "text-amber-400 font-semibold"
                                    : "text-green-400 font-semibold"
                              }
                            >
                              {item["DURAÇÃO EM DIAS"]} dias
                            </span>
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
                  Mostrando {filteredData.length} de {data?.total_itens} itens
                </p>
              </TabsContent>
            </Tabs>
          </div>
        </Card>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>Dashboard de Controle de Estoque • Atualizado em tempo real</p>
        </div>
      </footer>
    </div>
  );
}
