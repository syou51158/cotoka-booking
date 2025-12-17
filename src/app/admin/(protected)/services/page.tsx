"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2, Plus, Edit } from "lucide-react";
import { formatCurrency } from "@/lib/format";

type Service = {
  id: string;
  name: string;
  name_en?: string;
  name_zh?: string;
  description?: string;
  description_en?: string;
  description_zh?: string;
  duration_min: number;
  price_jpy: number;
  buffer_before_min: number;
  buffer_after_min: number;
  require_prepayment: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export default function AdminServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    name_en: "",
    name_zh: "",
    description: "",
    description_en: "",
    description_zh: "",
    duration_min: 60,
    price_jpy: 0,
    buffer_before_min: 0,
    buffer_after_min: 0,
    require_prepayment: false,
    active: true,
  });

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/services");
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      setServices(data);
    } catch (error: any) {
      console.error("サービス取得エラー:", error);
      toast.error("サービスの取得に失敗しました: " + (error?.message || "不明なエラー"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("サービス名は必須です");
      return;
    }
    if (formData.duration_min <= 0) {
      toast.error("所要時間は正の数値である必要があります");
      return;
    }
    if (formData.price_jpy < 0) {
      toast.error("価格は0以上の数値である必要があります");
      return;
    }

    try {
      const url = editingService ? `/api/admin/services/${editingService.id}` : "/api/admin/services";
      const method = editingService ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data?.error) throw new Error(data.error);

      await fetchServices();
      setShowForm(false);
      setEditingService(null);
      toast.success(editingService ? "サービスを更新しました" : "サービスを作成しました");
    } catch (error: any) {
      toast.error("保存に失敗しました: " + error.message);
    }
  };

  const handleDelete = async (service: Service) => {
    if (!confirm(`「${service.name}」を削除してもよろしいですか？`)) return;

    try {
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data?.error) throw new Error(data.error);

      await fetchServices();
      toast.success("サービスを削除しました");
    } catch (error: any) {
      toast.error("削除に失敗しました: " + error.message);
    }
  };

  const openEditForm = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      name_en: service.name_en || "",
      name_zh: service.name_zh || "",
      description: service.description || "",
      description_en: service.description_en || "",
      description_zh: service.description_zh || "",
      duration_min: service.duration_min,
      price_jpy: service.price_jpy,
      buffer_before_min: service.buffer_before_min,
      buffer_after_min: service.buffer_after_min,
      require_prepayment: service.require_prepayment,
      active: service.active,
    });
    setShowForm(true);
  };

  const openCreateForm = () => {
    setEditingService(null);
    setFormData({
      name: "",
      name_en: "",
      name_zh: "",
      description: "",
      description_en: "",
      description_zh: "",
      duration_min: 60,
      price_jpy: 0,
      buffer_before_min: 0,
      buffer_after_min: 0,
      require_prepayment: false,
      active: true,
    });
    setShowForm(true);
  };

  const filteredServices = services.filter(s => showInactive || s.active);

  if (loading) {
    return (
      <div className="py-8 px-4">
        <div className="text-center text-slate-200">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white drop-shadow-md">メニュー管理</h1>
        <p className="text-sm text-slate-400">サービスの作成・編集・公開状態を管理します。</p>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="show-inactive"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="show-inactive" className="text-slate-300">非アクティブも表示</Label>
          </div>
        </div>
        <Button onClick={openCreateForm}>
          <Plus className="w-4 h-4 mr-2" />
          新規メニュー
        </Button>
      </div>

      {/* サービス一覧 */}
      <div className="grid gap-4">
        {filteredServices.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/40">
            <CardContent className="py-8 text-center text-slate-400">
              {showInactive ? "メニューが登録されていません" : "アクティブなメニューがありません"}
            </CardContent>
          </Card>
        ) : (
          filteredServices.map((service) => (
            <Card key={service.id} className={`border-slate-800 bg-slate-900/40 ${!service.active ? "opacity-60" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-slate-100">{service.name}</h3>
                      {service.active ? (
                        <span className="px-2 py-1 bg-green-900/30 text-green-200 border border-green-700 text-xs rounded-full">アクティブ</span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-800 text-slate-300 border border-slate-700 text-xs rounded-full">非アクティブ</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-slate-300 mb-3">
                      <div>
                        <span className="font-medium">所要時間:</span> {service.duration_min}分
                      </div>
                      <div>
                        <span className="font-medium">価格:</span> {formatCurrency(service.price_jpy)}
                      </div>
                      <div>
                        <span className="font-medium">前バッファ:</span> {service.buffer_before_min}分
                      </div>
                      <div>
                        <span className="font-medium">後バッファ:</span> {service.buffer_after_min}分
                      </div>
                    </div>

                    {service.description && (
                      <p className="text-sm text-slate-400 mb-2">{service.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-sm">
                      {service.require_prepayment && (
                        <span className="px-2 py-1 bg-blue-900/30 text-blue-200 border border-blue-700 rounded-full">前払い必須</span>
                      )}
                      {service.name_en && (
                        <span className="text-slate-400">EN: {service.name_en}</span>
                      )}
                      {service.name_zh && (
                        <span className="text-slate-400">中文: {service.name_zh}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditForm(service)}
                      className="border-slate-700 text-slate-900 bg-white hover:bg-slate-100"
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      編集
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(service)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 作成・編集フォーム */}
      {showForm && (
        <Card className="fixed inset-4 z-50 overflow-y-auto border-slate-800 bg-slate-900/40">
          <CardHeader>
            <CardTitle className="text-slate-200">
              {editingService ? "メニュー編集" : "新規メニュー作成"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name" className="text-slate-300">サービス名（日本語） *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
                <div>
                  <Label htmlFor="name_en" className="text-slate-300">サービス名（英語）</Label>
                  <Input
                    id="name_en"
                    value={formData.name_en}
                    onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
                <div>
                  <Label htmlFor="name_zh" className="text-slate-300">サービス名（中国語）</Label>
                  <Input
                    id="name_zh"
                    value={formData.name_zh}
                    onChange={(e) => setFormData({ ...formData, name_zh: e.target.value })}
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="description" className="text-slate-300">説明（日本語）</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
                <div>
                  <Label htmlFor="description_en" className="text-slate-300">説明（英語）</Label>
                  <Textarea
                    id="description_en"
                    value={formData.description_en}
                    onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                    rows={3}
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
                <div>
                  <Label htmlFor="description_zh" className="text-slate-300">説明（中国語）</Label>
                  <Textarea
                    id="description_zh"
                    value={formData.description_zh}
                    onChange={(e) => setFormData({ ...formData, description_zh: e.target.value })}
                    rows={3}
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="duration_min" className="text-slate-300">所要時間（分） *</Label>
                  <Input
                    id="duration_min"
                    type="number"
                    min="1"
                    value={formData.duration_min}
                    onChange={(e) => setFormData({ ...formData, duration_min: parseInt(e.target.value) || 0 })}
                    required
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
                <div>
                  <Label htmlFor="price_jpy" className="text-slate-300">価格（円） *</Label>
                  <Input
                    id="price_jpy"
                    type="number"
                    min="0"
                    step="100"
                    value={formData.price_jpy}
                    onChange={(e) => setFormData({ ...formData, price_jpy: parseInt(e.target.value) || 0 })}
                    required
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
                <div>
                  <Label htmlFor="buffer_before_min" className="text-slate-300">前バッファ（分）</Label>
                  <Input
                    id="buffer_before_min"
                    type="number"
                    min="0"
                    value={formData.buffer_before_min}
                    onChange={(e) => setFormData({ ...formData, buffer_before_min: parseInt(e.target.value) || 0 })}
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
                <div>
                  <Label htmlFor="buffer_after_min" className="text-slate-300">後バッファ（分）</Label>
                  <Input
                    id="buffer_after_min"
                    type="number"
                    min="0"
                    value={formData.buffer_after_min}
                    onChange={(e) => setFormData({ ...formData, buffer_after_min: parseInt(e.target.value) || 0 })}
                    className="bg-slate-900/80 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="require_prepayment"
                    checked={formData.require_prepayment}
                    onChange={(e) => setFormData({ ...formData, require_prepayment: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="require_prepayment" className="text-slate-300">前払い必須</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="active" className="text-slate-300">アクティブ</Label>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="border-slate-700 text-slate-200"
                >
                  キャンセル
                </Button>
                <Button type="submit">{editingService ? "更新" : "作成"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}