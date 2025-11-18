'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Target,
  Upload,
  FileText,
  TrendingUp,
  TrendingDown,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Edit2,
  Save,
  PlayCircle,
  RefreshCw,
  Trash2,
  Database,
  Search,
} from 'lucide-react';

interface TradeOrder {
  id: string;
  symbol: string;
  direction: string;
  orderType: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  riskAmount: number;
  lotSize: number;
  status: string;
  mt5Ticket?: string;
  executionPrice?: number;
  createdAt: string;
  isEditing?: boolean;
}

interface ParsedOrder {
  symbol: string;
  direction: string;
  orderType: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit1?: number | null;
  takeProfit2?: number | null;
  takeProfit3?: number | null;
  riskAmount: number;
  lotSize: number | null;
  // Elliott Wave specific fields
  category?: string;
  timeframe?: string;
  wavePattern?: string | null;
  waveCount?: string | null;
  targetArea?: number | null;
  invalidation?: number | null;
  confidence?: number | null;
  analysis?: string | null;
  analysisDate?: string;
  notes?: string | null;
}

export default function TradeOperationsPage() {
  const [activeTab, setActiveTab] = useState('upload');

  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [parsedOrders, setParsedOrders] = useState<ParsedOrder[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Orders state
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Trading Setups state
  const [tradingSetups, setTradingSetups] = useState<any[]>([]);
  const [selectedSetups, setSelectedSetups] = useState<Set<string>>(new Set());
  const [loadingSetups, setLoadingSetups] = useState(false);
  const [publishingSetups, setPublishingSetups] = useState(false);
  const [executingSetup, setExecutingSetup] = useState(false);

  // Broker Symbols state
  const [brokerSymbols, setBrokerSymbols] = useState<any[]>([]);
  const [symbolMappings, setSymbolMappings] = useState<any[]>([]);
  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [symbolSearchTerm, setSymbolSearchTerm] = useState('');
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [newMapping, setNewMapping] = useState({ standardSymbol: '', brokerSymbol: '' });

  useEffect(() => {
    loadAccounts();
    loadOrders();
    loadTradingSetups();
  }, []);

  // Load broker symbols when account changes
  useEffect(() => {
    if (selectedAccount && activeTab === 'symbols') {
      loadBrokerSymbols();
    }
  }, [selectedAccount, activeTab]);

  const loadAccounts = async () => {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
        if (data.length > 0) {
          setSelectedAccount(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/trade-orders');
      if (!response.ok) throw new Error('Failed to load orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTradingSetups = async () => {
    setLoadingSetups(true);
    try {
      const response = await fetch('/api/admin/trading-setups/list');
      if (!response.ok) throw new Error('Failed to load trading setups');
      const data = await response.json();
      setTradingSetups(data.setups || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSetups(false);
    }
  };

  const loadBrokerSymbols = async () => {
    if (!selectedAccount) return;

    setLoadingSymbols(true);
    try {
      const response = await fetch(`/api/mt5/symbols/${selectedAccount}`);
      if (!response.ok) throw new Error('Failed to load broker symbols');
      const data = await response.json();
      setBrokerSymbols(data.symbols || []);
      setSymbolMappings(data.mappings || []);
      setSuccess(`Loaded ${data.symbols?.length || 0} symbols and ${data.mappings?.length || 0} mappings`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSymbols(false);
    }
  };

  const createSymbolMapping = async () => {
    if (!selectedAccount || !newMapping.standardSymbol || !newMapping.brokerSymbol) {
      setError('Please fill in both standard and broker symbol');
      return;
    }

    try {
      const response = await fetch('/api/admin/symbols/mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount,
          standardSymbol: newMapping.standardSymbol,
          brokerSymbol: newMapping.brokerSymbol,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to create mapping');
      }

      setSuccess('Mapping created successfully');
      setNewMapping({ standardSymbol: '', brokerSymbol: '' });
      setShowMappingDialog(false);
      await loadBrokerSymbols();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteSymbolMapping = async (standardSymbol: string) => {
    if (!selectedAccount) return;

    try {
      const response = await fetch(
        `/api/admin/symbols/mapping?accountId=${selectedAccount}&standardSymbol=${standardSymbol}`,
        { method: 'DELETE' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete mapping');
      }

      setSuccess('Mapping deleted successfully');
      await loadBrokerSymbols();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleSetup = (setupId: string) => {
    const newSelected = new Set(selectedSetups);
    if (newSelected.has(setupId)) {
      newSelected.delete(setupId);
    } else {
      newSelected.add(setupId);
    }
    setSelectedSetups(newSelected);
  };

  const toggleAllSetups = () => {
    if (selectedSetups.size === tradingSetups.length) {
      setSelectedSetups(new Set());
    } else {
      setSelectedSetups(new Set(tradingSetups.map(s => s.id)));
    }
  };

  const publishSetups = async (isActive: boolean) => {
    if (selectedSetups.size === 0) {
      setError('Seleziona almeno un setup');
      return;
    }

    setPublishingSetups(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/trading-setups/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupIds: Array.from(selectedSetups),
          isActive
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to publish setups');
      }

      setSuccess(result.message);
      setSelectedSetups(new Set());
      await loadTradingSetups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishingSetups(false);
    }
  };

  const executeSetup = async (setupId: string) => {
    if (!selectedAccount) {
      setError('Seleziona un account MT5');
      return;
    }

    setExecutingSetup(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/trading-setups/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupId,
          accountId: selectedAccount,
          // lotSize removed - API will use 0 to trigger EA's automatic calculation
          riskAmount: 100
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to execute setup');
      }

      setSuccess(result.message);
      await loadOrders();
      setActiveTab('pending');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExecutingSetup(false);
    }
  };

  const deleteSetups = async () => {
    if (selectedSetups.size === 0) {
      setError('Seleziona almeno un setup da eliminare');
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/trading-setups/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setupIds: Array.from(selectedSetups)
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete setups');
      }

      setSuccess(result.message);
      setSelectedSetups(new Set());
      await loadTradingSetups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.yaml') && !file.name.endsWith('.yml') && !file.name.endsWith('.txt')) {
        setUploadError('Please upload a YAML (.yaml, .yml) or TXT file');
        return;
      }
      setSelectedFile(file);
      setUploadError(null);
      setParsedOrders([]);
    }
  };

  const handleParseYAML = async () => {
    if (!selectedFile || !selectedAccount) {
      setUploadError('Please select a file and account');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('accountId', selectedAccount);
      formData.append('previewOnly', 'true');

      const response = await fetch('/api/yaml/parse', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setParsedOrders(result.orders || []);
        setSuccess(`✅ Parsed ${result.orders?.length || 0} setups from YAML`);
        console.log('[YAML Parse] Success:', result);
      } else {
        // Display detailed error information
        let errorMessage = result.message || result.error || 'Failed to parse YAML';

        // Add detailed validation errors if available
        if (result.parseErrors && result.parseErrors.length > 0) {
          const errorDetails = result.parseErrors.map((err: any) => {
            const setupInfo = err.setupSymbol || `Setup #${err.index + 1}`;
            const fieldErrors = err.errors.map((e: any) =>
              `  • ${e.field}: ${e.message}${e.value !== undefined ? ` (value: ${e.value})` : ''}`
            ).join('\n');
            return `\n${setupInfo}:\n${fieldErrors}`;
          }).join('\n');

          errorMessage = `${errorMessage}\n\n📋 Validation Errors:${errorDetails}`;
        }

        setUploadError(errorMessage);
        console.error('[YAML Parse] Error:', result);
      }
    } catch (error: any) {
      setUploadError(error.message || 'Network error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmOrders = async () => {
    if (parsedOrders.length === 0) {
      setUploadError('No orders to confirm');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fetch('/api/yaml/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: selectedAccount,
          orders: parsedOrders,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setSuccess(`✅ Created ${result.createdCount} trading setups successfully`);
        setParsedOrders([]);
        setSelectedFile(null);
        await loadTradingSetups();
        setActiveTab('setups');
      } else {
        // Show detailed error message
        let errorMsg = result.error || 'Failed to create orders';
        if (result.message) {
          errorMsg += `\n\nDetails: ${result.message}`;
        }
        if (result.details && process.env.NODE_ENV === 'development') {
          errorMsg += `\n\n${result.details}`;
        }
        console.error('[Confirm Orders] Error:', result);
        setUploadError(errorMsg);
      }
    } catch (error: any) {
      setUploadError(error.message || 'Network error');
    } finally {
      setIsUploading(false);
    }
  };

  const updateParsedOrder = (index: number, field: string, value: any) => {
    const updated = [...parsedOrders];
    updated[index] = { ...updated[index], [field]: value };
    setParsedOrders(updated);
  };

  const removeParsedOrder = (index: number) => {
    setParsedOrders(parsedOrders.filter((_, i) => i !== index));
  };

  const toggleOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAll = (ordersList: TradeOrder[]) => {
    if (selectedOrders.size === ordersList.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(ordersList.map(o => o.id)));
    }
  };

  const executeSelectedOrders = async () => {
    if (selectedOrders.size === 0) {
      setError('Please select at least one order to execute');
      return;
    }

    setExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/trade-orders/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderIds: Array.from(selectedOrders) }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to execute orders');
      }

      setSuccess(`Successfully executed ${result.executedCount} orders`);
      setSelectedOrders(new Set());
      await loadOrders();
      setActiveTab('active');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExecuting(false);
    }
  };

  const deleteSelectedOrders = async () => {
    if (selectedOrders.size === 0) {
      setError('Please select at least one order to delete');
      return;
    }

    setDeleting(true);
    setError(null);
    setSuccess(null);

    try {
      const orderIds = Array.from(selectedOrders);

      // Delete all selected orders
      const deletePromises = orderIds.map(orderId =>
        fetch(`/api/trade-orders/${orderId}`, {
          method: 'DELETE',
        })
      );

      const results = await Promise.all(deletePromises);

      // Check if all deletions were successful
      const failedCount = results.filter(r => !r.ok).length;

      if (failedCount > 0) {
        throw new Error(`Failed to delete ${failedCount} orders`);
      }

      setSuccess(`Successfully deleted ${orderIds.length} orders`);
      setSelectedOrders(new Set());
      await loadOrders();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const cancelOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/trade-orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to cancel order');

      setSuccess('Order canceled');
      loadOrders();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'PENDING');
  const approvedOrders = orders.filter(o => o.status === 'APPROVED');
  const activeOrders = orders.filter(o => o.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Target className="w-8 h-8 text-primary" />
          Trade Operations Center
        </h1>
        <p className="text-muted-foreground">
          Unified workspace for YAML upload, order management, and execution monitoring
        </p>
      </div>

      {/* Success/Error Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">{success}</AlertDescription>
        </Alert>
      )}

      {uploadError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="upload">
            <Upload className="w-4 h-4 mr-2" />
            Upload YAML
          </TabsTrigger>
          <TabsTrigger value="setups">
            <Target className="w-4 h-4 mr-2" />
            Trading Setups
          </TabsTrigger>
          <TabsTrigger value="symbols">
            <Database className="w-4 h-4 mr-2" />
            Broker Symbols
          </TabsTrigger>
          <TabsTrigger value="pending">
            <FileText className="w-4 h-4 mr-2" />
            Pending Orders ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="active">
            <CheckCircle className="w-4 h-4 mr-2" />
            Active Orders ({approvedOrders.length + activeOrders.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Upload YAML */}
        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload & Parse YAML
              </CardTitle>
              <CardDescription>
                Upload your Elliott Wave setups and preview orders before creating them
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Account Selection */}
              <div>
                <Label>Trading Account</Label>
                {accounts.length === 0 ? (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No trading accounts found. Please add an account first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full p-2 border rounded-md mt-2"
                  >
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.login} - {account.broker} ({account.accountType})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* File Input */}
              <div>
                <Label>YAML File</Label>
                <input
                  type="file"
                  accept=".yaml,.yml,.txt"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-slate-500 mt-2
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-primary file:text-primary-foreground
                    hover:file:bg-primary/90
                    cursor-pointer"
                />
                {selectedFile && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>

              {/* Parse Button */}
              <Button
                onClick={handleParseYAML}
                disabled={!selectedFile || !selectedAccount || isUploading}
                className="w-full"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Parse YAML
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Parsed Orders Preview */}
          {parsedOrders.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Parsed Orders Preview ({parsedOrders.length})</CardTitle>
                    <CardDescription>
                      Review and edit orders before creating them
                    </CardDescription>
                  </div>
                  <Button onClick={handleConfirmOrders} disabled={isUploading}>
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm & Create Orders
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {parsedOrders.map((order, index) => {
                    const isAnalysisOnly = order.orderType === 'ANALYSIS_ONLY';

                    return (
                      <div key={index} className="border rounded-lg p-4 space-y-3">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg">{order.symbol}</span>
                            {order.direction === 'BUY' ? (
                              <Badge className="bg-green-100 text-green-800">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                BUY
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                SELL
                              </Badge>
                            )}
                            {isAnalysisOnly ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                📊 ANALYSIS ONLY
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                ✅ EXECUTABLE
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeParsedOrder(index)}
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>

                        {/* Setup Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          {order.category && (
                            <div>
                              <span className="text-muted-foreground">Category:</span>
                              <span className="ml-2 font-medium">{order.category}</span>
                            </div>
                          )}
                          {order.timeframe && (
                            <div>
                              <span className="text-muted-foreground">Timeframe:</span>
                              <span className="ml-2 font-medium">{order.timeframe}</span>
                            </div>
                          )}
                          {order.wavePattern && (
                            <div>
                              <span className="text-muted-foreground">Pattern:</span>
                              <span className="ml-2 font-medium">{order.wavePattern}</span>
                            </div>
                          )}
                          {order.confidence && (
                            <div>
                              <span className="text-muted-foreground">Confidence:</span>
                              <span className="ml-2 font-medium">{order.confidence}%</span>
                            </div>
                          )}
                        </div>

                        {/* Price Fields */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">Entry Price</label>
                            <Input
                              type="number"
                              step="0.00001"
                              value={order.entryPrice || ''}
                              onChange={(e) => updateParsedOrder(index, 'entryPrice', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder={isAnalysisOnly ? "Not set" : "Required"}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Stop Loss</label>
                            <Input
                              type="number"
                              step="0.00001"
                              value={order.stopLoss || ''}
                              onChange={(e) => updateParsedOrder(index, 'stopLoss', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder={isAnalysisOnly ? "Not set" : "Required"}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Target Area</label>
                            <Input
                              type="number"
                              step="0.00001"
                              value={order.targetArea || ''}
                              onChange={(e) => updateParsedOrder(index, 'targetArea', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="Optional"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">Invalidation</label>
                            <Input
                              type="number"
                              step="0.00001"
                              value={order.invalidation || ''}
                              onChange={(e) => updateParsedOrder(index, 'invalidation', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="Optional"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {/* Take Profits */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs text-muted-foreground">TP1</label>
                            <Input
                              type="number"
                              step="0.00001"
                              value={order.takeProfit1 || ''}
                              onChange={(e) => updateParsedOrder(index, 'takeProfit1', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="Optional"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">TP2</label>
                            <Input
                              type="number"
                              step="0.00001"
                              value={order.takeProfit2 || ''}
                              onChange={(e) => updateParsedOrder(index, 'takeProfit2', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="Optional"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-muted-foreground">TP3</label>
                            <Input
                              type="number"
                              step="0.00001"
                              value={order.takeProfit3 || ''}
                              onChange={(e) => updateParsedOrder(index, 'takeProfit3', e.target.value ? parseFloat(e.target.value) : null)}
                              placeholder="Optional"
                              className="mt-1"
                            />
                          </div>
                        </div>

                        {/* Analysis Note */}
                        {order.notes && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <span className="text-xs font-semibold text-blue-900">Note: </span>
                            <span className="text-xs text-blue-800">{order.notes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 2: Trading Setups */}
        <TabsContent value="setups" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Trading Setups ({tradingSetups.length})</CardTitle>
                  <CardDescription>
                    Gestisci i setup Elliott Wave: pubblica in Trading Room o esegui su MT5
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadTradingSetups} disabled={loadingSetups}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  {selectedSetups.size > 0 && (
                    <>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => publishSetups(true)}
                        disabled={publishingSetups}
                      >
                        {publishingSetups ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        Pubblica ({selectedSetups.size})
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => publishSetups(false)}
                        disabled={publishingSetups}
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Depubblica ({selectedSetups.size})
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={deleteSetups}
                        disabled={deleting}
                      >
                        {deleting ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}
                        Elimina ({selectedSetups.size})
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingSetups ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : tradingSetups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nessun setup disponibile. Upload un file YAML per creare setup.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Checkbox
                      checked={selectedSetups.size === tradingSetups.length && tradingSetups.length > 0}
                      onCheckedChange={toggleAllSetups}
                    />
                    <Label className="text-sm">Seleziona tutti</Label>
                  </div>

                  {tradingSetups.map((setup) => {
                    // Setup is executable if it has at least stopLoss (entryPrice is optional for MARKET orders)
                    const isAnalysisOnly = !setup.stopLoss;

                    return (
                      <div
                        key={setup.id}
                        className={`border rounded-lg p-4 space-y-3 ${selectedSetups.has(setup.id) ? 'border-blue-500 bg-blue-50' : ''}`}
                      >
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={selectedSetups.has(setup.id)}
                              onCheckedChange={() => toggleSetup(setup.id)}
                            />
                            <span className="font-bold text-lg">{setup.symbol}</span>
                            {setup.direction === 'BUY' ? (
                              <Badge className="bg-green-100 text-green-800">
                                <TrendingUp className="w-3 h-3 mr-1" />
                                BUY
                              </Badge>
                            ) : (
                              <Badge className="bg-red-100 text-red-800">
                                <TrendingDown className="w-3 h-3 mr-1" />
                                SELL
                              </Badge>
                            )}
                            {isAnalysisOnly ? (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                📊 ANALYSIS ONLY
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                ✅ EXECUTABLE
                              </Badge>
                            )}
                            {setup.isActive ? (
                              <Badge className="bg-green-500 text-white">
                                ✓ Pubblicato
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                Bozza
                              </Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {!isAnalysisOnly && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => executeSetup(setup.id)}
                                disabled={executingSetup || !selectedAccount}
                              >
                                {executingSetup ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <PlayCircle className="w-4 h-4 mr-2" />
                                )}
                                Esegui MT5
                              </Button>
                            )}
                          </div>
                        </div>

                        {/* Setup Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          {setup.category && (
                            <div>
                              <span className="text-muted-foreground">Category:</span>
                              <span className="ml-2 font-medium">{setup.category}</span>
                            </div>
                          )}
                          {setup.timeframe && (
                            <div>
                              <span className="text-muted-foreground">Timeframe:</span>
                              <span className="ml-2 font-medium">{setup.timeframe}</span>
                            </div>
                          )}
                          {setup.wavePattern && (
                            <div>
                              <span className="text-muted-foreground">Pattern:</span>
                              <span className="ml-2 font-medium">{setup.wavePattern}</span>
                            </div>
                          )}
                          {setup.confidence && (
                            <div>
                              <span className="text-muted-foreground">Confidence:</span>
                              <span className="ml-2 font-medium">{setup.confidence}%</span>
                            </div>
                          )}
                        </div>

                        {/* Price Levels */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-gray-50 p-3 rounded">
                          <div>
                            <span className="text-muted-foreground">Entry:</span>
                            <span className="ml-2 font-medium">
                              {setup.entryPrice || (setup.stopLoss ? '🔴 MARKET' : 'N/A')}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Stop Loss:</span>
                            <span className="ml-2 font-medium">{setup.stopLoss || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Target Area:</span>
                            <span className="ml-2 font-medium">{setup.targetArea || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Invalidation:</span>
                            <span className="ml-2 font-medium">{setup.invalidation || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Notes */}
                        {setup.notes && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <span className="text-xs font-semibold text-blue-900">Note: </span>
                            <span className="text-xs text-blue-800">{setup.notes}</span>
                          </div>
                        )}

                        {/* Analysis */}
                        {setup.analysis && (
                          <details className="text-sm">
                            <summary className="cursor-pointer font-semibold text-blue-900">
                              📋 Analisi dettagliata
                            </summary>
                            <div className="mt-2 text-gray-700 whitespace-pre-wrap">{setup.analysis}</div>
                          </details>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Broker Symbols */}
        <TabsContent value="symbols" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Broker Symbols
                  </CardTitle>
                  <CardDescription>
                    Gestisci simboli disponibili sul broker e mappature standard → broker-specific
                  </CardDescription>
                </div>
                <Button onClick={loadBrokerSymbols} disabled={!selectedAccount || loadingSymbols}>
                  {loadingSymbols ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {!selectedAccount ? (
                <div className="text-center py-8 text-muted-foreground">
                  Seleziona un account per vedere i simboli broker
                </div>
              ) : loadingSymbols ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{brokerSymbols.length}</div>
                        <p className="text-xs text-muted-foreground">Total Symbols</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{symbolMappings.length}</div>
                        <p className="text-xs text-muted-foreground">Mappings</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-2xl font-bold">
                          {brokerSymbols.filter((s) => s.tradeMode === 'FULL').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Tradeable</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Symbol Mappings */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Symbol Mappings</h3>
                      <Button onClick={() => setShowMappingDialog(true)} size="sm">
                        Create Mapping
                      </Button>
                    </div>

                    {symbolMappings.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No mappings yet. Create one to map standard symbols to broker-specific symbols.
                      </div>
                    ) : (
                      <div className="border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Standard Symbol</TableHead>
                              <TableHead>Broker Symbol</TableHead>
                              <TableHead>Confidence</TableHead>
                              <TableHead>Source</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {symbolMappings.map((mapping) => (
                              <TableRow key={mapping.id}>
                                <TableCell className="font-medium">{mapping.standardSymbol}</TableCell>
                                <TableCell>{mapping.brokerSymbol}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={mapping.confidence >= 0.8 ? 'default' : mapping.confidence >= 0.5 ? 'outline' : 'secondary'}
                                  >
                                    {Math.round(mapping.confidence * 100)}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{mapping.source}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteSymbolMapping(mapping.standardSymbol)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Broker Symbols */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Available Broker Symbols</h3>
                      <div className="relative w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search symbols..."
                          value={symbolSearchTerm}
                          onChange={(e) => setSymbolSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>

                    {brokerSymbols.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p className="mb-2">No symbols synced yet</p>
                        <p className="text-sm">
                          Connect your MT5 EA to automatically sync all available symbols
                        </p>
                      </div>
                    ) : (
                      <div className="border rounded-lg max-h-96 overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Symbol</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Min Lot</TableHead>
                              <TableHead>Max Lot</TableHead>
                              <TableHead>Stop Level</TableHead>
                              <TableHead>Trade Mode</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {brokerSymbols
                              .filter((symbol) =>
                                symbolSearchTerm
                                  ? symbol.symbol.toLowerCase().includes(symbolSearchTerm.toLowerCase()) ||
                                    symbol.description?.toLowerCase().includes(symbolSearchTerm.toLowerCase())
                                  : true
                              )
                              .slice(0, 50) // Limit to 50 for performance
                              .map((symbol) => (
                                <TableRow key={symbol.id}>
                                  <TableCell className="font-medium">{symbol.symbol}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {symbol.description || '-'}
                                  </TableCell>
                                  <TableCell>{symbol.minLot}</TableCell>
                                  <TableCell>{symbol.maxLot}</TableCell>
                                  <TableCell>{symbol.stopLevel}</TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        symbol.tradeMode === 'FULL'
                                          ? 'default'
                                          : symbol.tradeMode === 'CLOSE_ONLY'
                                          ? 'outline'
                                          : 'secondary'
                                      }
                                    >
                                      {symbol.tradeMode}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>

                  {/* Create Mapping Dialog */}
                  {showMappingDialog && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                      <Card className="w-full max-w-md">
                        <CardHeader>
                          <CardTitle>Create Symbol Mapping</CardTitle>
                          <CardDescription>
                            Map a standard symbol name to broker-specific symbol
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <Label>Standard Symbol (e.g., GOLD, WTI, EURUSD)</Label>
                            <Input
                              placeholder="GOLD"
                              value={newMapping.standardSymbol}
                              onChange={(e) =>
                                setNewMapping({ ...newMapping, standardSymbol: e.target.value.toUpperCase() })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Broker Symbol (must exist in broker symbols)</Label>
                            <Input
                              placeholder="XAUUSD"
                              value={newMapping.brokerSymbol}
                              onChange={(e) =>
                                setNewMapping({ ...newMapping, brokerSymbol: e.target.value.toUpperCase() })
                              }
                            />
                          </div>
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" onClick={() => setShowMappingDialog(false)}>
                              Cancel
                            </Button>
                            <Button onClick={createSymbolMapping}>Create Mapping</Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4: Pending Orders */}
        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Orders ({pendingOrders.length})</CardTitle>
                  <CardDescription>
                    Select orders to execute on MT5
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={loadOrders}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                  {pendingOrders.length > 0 && selectedOrders.size > 0 && (
                    <Button
                      variant="destructive"
                      onClick={deleteSelectedOrders}
                      disabled={deleting || executing}
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Selected ({selectedOrders.size})
                        </>
                      )}
                    </Button>
                  )}
                  {pendingOrders.length > 0 && (
                    <Button
                      onClick={executeSelectedOrders}
                      disabled={selectedOrders.size === 0 || executing || deleting}
                    >
                      {executing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <PlayCircle className="w-4 h-4 mr-2" />
                          Execute Selected ({selectedOrders.size})
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : pendingOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">No pending orders</p>
                  <p className="text-sm">Upload a YAML file to generate trade orders</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedOrders.size === pendingOrders.length}
                          onCheckedChange={() => toggleAll(pendingOrders)}
                        />
                      </TableHead>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Stop Loss</TableHead>
                      <TableHead>Take Profit</TableHead>
                      <TableHead>Risk</TableHead>
                      <TableHead>Lot Size</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedOrders.has(order.id)}
                            onCheckedChange={() => toggleOrder(order.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{order.symbol}</TableCell>
                        <TableCell>
                          {order.direction === 'BUY' ? (
                            <Badge className="bg-green-100 text-green-800">
                              <TrendingUp className="w-3 h-3 mr-1" />
                              BUY
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <TrendingDown className="w-3 h-3 mr-1" />
                              SELL
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{order.entryPrice.toFixed(5)}</TableCell>
                        <TableCell className="text-red-600">
                          {order.stopLoss.toFixed(5)}
                        </TableCell>
                        <TableCell className="text-green-600">
                          {order.takeProfit1 ? order.takeProfit1.toFixed(5) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          ${order.riskAmount.toFixed(2)}
                        </TableCell>
                        <TableCell>{order.lotSize.toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelOrder(order.id)}
                          >
                            <XCircle className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Active Orders */}
        <TabsContent value="active" className="space-y-4">
          {/* Approved Orders */}
          {approvedOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Approved - Waiting for MT5 ({approvedOrders.length})</CardTitle>
                <CardDescription>
                  Orders approved and waiting for MT5 EA to execute
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Lot Size</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Approved At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={order.direction === 'BUY' ? 'default' : 'secondary'}>
                            {order.direction}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.entryPrice.toFixed(5)}</TableCell>
                        <TableCell>{order.lotSize.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            APPROVED
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Active Orders */}
          {activeOrders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active on MT5 ({activeOrders.length})</CardTitle>
                <CardDescription>
                  Orders successfully executed on MT5 platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Symbol</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>MT5 Ticket</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Executed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.symbol}</TableCell>
                        <TableCell>
                          <Badge variant={order.direction === 'BUY' ? 'default' : 'secondary'}>
                            {order.direction}
                          </Badge>
                        </TableCell>
                        <TableCell>{order.entryPrice.toFixed(5)}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {order.mt5Ticket || 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            ACTIVE
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.createdAt).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {approvedOrders.length === 0 && activeOrders.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-2">No active orders</p>
                <p className="text-sm">Execute pending orders to see them here</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
