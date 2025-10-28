'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ClipboardList,
  TrendingUp,
  TrendingDown,
  Loader2,
  AlertTriangle,
  CheckCircle,
  PlayCircle,
  XCircle,
} from 'lucide-react';

interface TradeOrder {
  id: string;
  symbol: string;
  direction: string;
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
}

export default function TradeOrdersPage() {
  const [orders, setOrders] = useState<TradeOrder[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
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

  const toggleOrder = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const toggleAll = () => {
    if (selectedOrders.size === pendingOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(pendingOrders.map(o => o.id)));
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

      // Reload orders
      setTimeout(() => {
        loadOrders();
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExecuting(false);
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
  const approvedOrders = orders.filter(o => o.status === 'APPROVED'); // Waiting for MT5 EA
  const activeOrders = orders.filter(o => o.status === 'ACTIVE'); // Executed on MT5
  const executedOrders = orders.filter(o => o.status === 'EXECUTED'); // Legacy status

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="w-8 h-8" />
          Trade Orders
        </h1>
        <p className="text-muted-foreground">
          Review and execute your pending trade orders
        </p>
      </div>

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

      {/* Pending Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Orders ({pendingOrders.length})</CardTitle>
              <CardDescription>
                Select orders to execute on MT5
              </CardDescription>
            </div>
            {pendingOrders.length > 0 && (
              <Button
                onClick={executeSelectedOrders}
                disabled={selectedOrders.size === 0 || executing}
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
        </CardHeader>
        <CardContent>
          {pendingOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
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
                      onCheckedChange={toggleAll}
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

      {/* Approved Orders (Waiting for MT5) */}
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

      {/* Active Orders (Executed on MT5) */}
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
                {activeOrders.slice(0, 10).map((order) => (
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

      {/* Executed Orders (Legacy) */}
      {executedOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Executed ({executedOrders.length})</CardTitle>
            <CardDescription>
              Orders that have been sent to MT5
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Direction</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Executed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executedOrders.slice(0, 10).map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={order.direction === 'BUY' ? 'default' : 'secondary'}>
                        {order.direction}
                      </Badge>
                    </TableCell>
                    <TableCell>{order.entryPrice.toFixed(5)}</TableCell>
                    <TableCell>
                      <Badge className="bg-blue-100 text-blue-800">
                        {order.status}
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
    </div>
  );
}
