import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { formatResponseError, formatEdgeFunctionError } from '@/lib/edgeFunctionErrors';
import { 
  CreditCard, Wallet, Trash2, Loader2, 
  CheckCircle, Star, AlertCircle
} from 'lucide-react';

interface PaymentMethod {
  id: string;
  payment_type: string;
  is_default: boolean | null;
  last_four: string | null;
  card_brand: string | null;
  paypal_email: string | null;
  created_at: string;
}

export function BuyerPaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingStripe, setIsAddingStripe] = useState(false);
  const [isFinalizingSetup, setIsFinalizingSetup] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (user) {
      fetchPaymentMethods();
      handleSetupCallback();
    }
  }, [user]);

  const handleSetupCallback = async () => {
    const setupSuccess = searchParams.get('setup_success');
    const sessionId = searchParams.get('session_id');

    if (setupSuccess === 'true' && sessionId) {
      setIsFinalizingSetup(true);
      
      try {
        const response = await supabase.functions.invoke('create-setup-intent', {
          body: { sessionId },
        });

        if (response.error) {
          const formattedError = formatResponseError(response);
          toast({
            title: 'Setup Error',
            description: formattedError.message,
            variant: 'destructive',
          });
        } else if (response.data?.success) {
          toast({
            title: 'Card Added',
            description: 'Your payment method has been saved successfully.',
          });
          fetchPaymentMethods();
        }
      } catch (error) {
        const formattedError = formatEdgeFunctionError(error);
        toast({
          title: 'Error',
          description: formattedError.message,
          variant: 'destructive',
        });
      } finally {
        setIsFinalizingSetup(false);
        // Clean up URL params
        searchParams.delete('setup_success');
        searchParams.delete('session_id');
        searchParams.delete('setup_canceled');
        setSearchParams(searchParams, { replace: true });
      }
    }

    // Handle canceled setup
    if (searchParams.get('setup_canceled') === 'true') {
      toast({
        title: 'Setup Canceled',
        description: 'Card setup was canceled.',
      });
      searchParams.delete('setup_canceled');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const fetchPaymentMethods = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_payment_methods')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (error) throw error;
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStripeCard = async () => {
    setIsAddingStripe(true);
    try {
      const response = await supabase.functions.invoke('create-setup-intent');
      
      if (response.error) {
        const formattedError = formatResponseError(response);
        
        if (formattedError.isConfigurationError) {
          toast({ 
            title: 'Payments Unavailable', 
            description: 'Card payments are currently being configured. Please try again later.' 
          });
        } else {
          toast({ 
            title: 'Error', 
            description: formattedError.message, 
            variant: 'destructive' 
          });
        }
        return;
      }
      
      if (response.data?.url) {
        window.location.href = response.data.url;
      } else if (response.data?.error) {
        const formattedError = formatResponseError(response);
        toast({ 
          title: 'Error', 
          description: formattedError.message, 
          variant: 'destructive' 
        });
      }
    } catch (error: unknown) {
      const formattedError = formatEdgeFunctionError(error);
      
      if (formattedError.isNetworkError) {
        toast({ 
          title: 'Connection Error', 
          description: 'Unable to connect to payment services. Please check your connection and try again.',
          variant: 'destructive' 
        });
      } else {
        toast({ 
          title: 'Error', 
          description: formattedError.message, 
          variant: 'destructive' 
        });
      }
    } finally {
      setIsAddingStripe(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!user) return;

    try {
      // First, unset all defaults
      await supabase
        .from('user_payment_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from('user_payment_methods')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Success', description: 'Default payment method updated' });
      fetchPaymentMethods();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update default';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast({ title: 'Success', description: 'Payment method removed' });
      fetchPaymentMethods();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove payment method';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  if (isLoading || isFinalizingSetup) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          {isFinalizingSetup && (
            <p className="text-sm text-muted-foreground">Saving your card...</p>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" />
          Payment Methods
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {paymentMethods.length === 0 ? (
          <div className="text-center py-6">
            <CreditCard className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">No payment methods saved yet</p>
            <p className="text-sm text-muted-foreground">
              Add a payment method to make checkout faster and easier.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div 
                key={method.id}
                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-3">
                  {method.payment_type === 'stripe' ? (
                    <CreditCard className="w-5 h-5 text-primary" />
                  ) : (
                    <Wallet className="w-5 h-5 text-blue-500" />
                  )}
                  <div>
                    {method.payment_type === 'stripe' ? (
                      <>
                        <p className="font-medium">
                          {method.card_brand || 'Card'} •••• {method.last_four}
                        </p>
                        <p className="text-xs text-muted-foreground">Credit/Debit Card</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium">{method.paypal_email}</p>
                        <p className="text-xs text-muted-foreground">PayPal</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.is_default ? (
                    <Badge className="bg-primary/20 text-primary border-primary/50">
                      <Star className="w-3 h-3 mr-1" />
                      Default
                    </Badge>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleSetDefault(method.id)}
                    >
                      Set Default
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(method.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-border/50">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={handleAddStripeCard}
            disabled={isAddingStripe}
          >
            {isAddingStripe ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4 mr-2" />
            )}
            Add Card
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Your payment information is securely stored and encrypted.
        </p>
      </CardContent>
    </Card>
  );
}
