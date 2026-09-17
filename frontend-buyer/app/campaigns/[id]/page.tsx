'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api-client';
import type { Product } from '@/services/product-service';

export default function DiscountLanding({ params }: { params: Promise<{id:string}> }) {
  const { id }=use(params); const [data,setData]=useState<{campaign:{name:string;description:string;ends_at:string;minimum_quantity:number;minimum_order_amount:number};products:Product[]} | null>(null); const [error,setError]=useState('');
  useEffect(()=>{api.get(`/buyer/campaigns/discounts/${id}`).then(r=>setData(r.data.data)).catch(()=>setError('This campaign is no longer available.'));},[id]);
  if(error) return <p className="p-8" role="alert">{error}</p>; if(!data) return <p className="p-8">Loading campaign…</p>;
  return <main className="max-w-7xl mx-auto p-6"><h1 className="text-3xl font-bold">{data.campaign.name}</h1><p className="my-3">{data.campaign.description}</p><p>Ends {new Date(data.campaign.ends_at).toLocaleString()}. Minimum {data.campaign.minimum_quantity} eligible units and €{data.campaign.minimum_order_amount}.</p><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">{data.products.map(p=><Link className="border rounded-xl p-4" key={p.id} href={`/products/${p.id}`}><h2 className="font-semibold">{p.name}</h2><p>€{Number(p.price).toFixed(2)}</p><span className="text-blue-700">Choose options →</span></Link>)}</div></main>;
}
