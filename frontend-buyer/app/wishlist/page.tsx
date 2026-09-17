'use client';
import { useEffect,useState } from 'react';
import Link from 'next/link';
import { wishlistService, WishlistItem } from '@/services/wishlist-service';
import Button from '@/components/ui/Button';
import { getFullImageUrl } from '@/lib/image-utils';

export default function WishlistPage(){ const [items,setItems]=useState<WishlistItem[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  const load=async()=>{setLoading(true);try{setItems((await wishlistService.list()).items||[]);}catch{setError('Could not load saved items.');}finally{setLoading(false);}}; useEffect(()=>{void load();},[]);
  const remove=async(id:number)=>{await wishlistService.remove(id);setItems(x=>x.filter(i=>i.product.id!==id));};
  return <main className="max-w-6xl mx-auto px-4 py-10"><div className="flex items-center justify-between mb-6"><div><h1 className="text-2xl font-bold">Saved Items</h1><p className="text-sm text-gray-500 mt-1">Your saved products in one place.</p></div><Link href="/profile" className="text-sm text-[#0066CC]">Back to profile</Link></div>{loading?<p>Loading…</p>:error?<p className="text-red-600">{error}</p>:items.length===0?<div className="rounded-xl border p-10 text-center text-gray-500">You have not saved any products yet.</div>:<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">{items.map(i=>{const price=i.product.pricing?.discounted_price??i.product.price;const original=i.product.pricing?.original_price;return <article key={i.id} className="rounded-xl border bg-white overflow-hidden"><img src={getFullImageUrl(i.product.images?.[0]||'/placeholder-product.png')} alt={i.product.name} className="w-full h-48 object-cover"/><div className="p-4"><h2 className="font-semibold line-clamp-2">{i.product.name}</h2><p className="text-xs text-gray-500 mt-1">{i.product.store?.name}</p><p className="font-bold mt-2">€{Number(price||0).toFixed(2)} {original&&Number(original)>Number(price)?<span className="text-xs text-gray-400 line-through ml-1">€{Number(original).toFixed(2)}</span>:null}</p><div className="flex gap-2 mt-4"><Link className="flex-1 text-center rounded-lg bg-[#0066CC] text-white px-3 py-2 text-sm" href={`/products/${i.product.id}`}>View</Link><Button variant="outline" size="sm" onClick={()=>void remove(i.product.id)}>Remove</Button></div></div></article>})}</div>}</main>;
}
