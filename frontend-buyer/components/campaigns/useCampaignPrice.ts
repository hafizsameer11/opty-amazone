'use client';
import { useEffect, useState } from 'react';
import { campaignService, type CampaignPrice } from '@/services/campaign-service';

export function useCampaignPrice(productId: number | undefined, selection: Record<string, unknown>, quantity = 1, enabled = true) {
  const [price,setPrice]=useState<CampaignPrice | null>(null); const [error,setError]=useState('');
  const key=JSON.stringify(selection);
  useEffect(()=>{
    let active=true; setPrice(null); setError(''); if (!productId || !enabled) return;
    const load=()=>campaignService.price(productId,JSON.parse(key),quantity).then(p=>{if(active) {setPrice(p);setError('');}}).catch(()=>{if(active) {setPrice(null);setError('Unable to confirm current price. Please retry.');}});
    const timer=setTimeout(load,150); const refresh=setInterval(load,60000);
    return ()=>{active=false;clearTimeout(timer);clearInterval(refresh);};
  },[productId,key,quantity,enabled]);
  return { price,error };
}
