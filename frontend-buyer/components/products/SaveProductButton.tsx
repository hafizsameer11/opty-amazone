'use client';
import { useEffect,useState } from 'react';
import { wishlistService } from '@/services/wishlist-service';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
export default function SaveProductButton({productId}:{productId:number}){const {isAuthenticated}=useAuth();const router=useRouter();const [saved,setSaved]=useState(false);const [busy,setBusy]=useState(false);useEffect(()=>{if(isAuthenticated)void wishlistService.status(productId).then(setSaved).catch(()=>{});},[isAuthenticated,productId]);const toggle=async()=>{if(!isAuthenticated){router.push(`/auth/login?redirect=${encodeURIComponent(location.pathname)}`);return;}setBusy(true);try{if(saved){await wishlistService.remove(productId);setSaved(false);}else{await wishlistService.save(productId);setSaved(true);}}finally{setBusy(false);}};return <button type="button" aria-label={saved?'Remove from saved items':'Save product'} onClick={()=>void toggle()} disabled={busy} className={`rounded-lg border px-3 py-2 text-sm ${saved?'border-red-300 text-red-600 bg-red-50':'border-gray-300 text-gray-700 hover:border-[#0066CC]'}`}>{saved?'♥ Saved':'♡ Save'}</button>}
