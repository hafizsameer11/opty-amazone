'use client';

import { useState, useEffect } from 'react';
import Input from '@/components/ui/Input';
import { CreateProductData } from '@/services/product-service';

interface CategoryProductFormProps {
  formData: CreateProductData;
  setFormData: (data: CreateProductData | ((prev: CreateProductData) => CreateProductData)) => void;
  enabledFields: string[];
  productType: string;
}

export default function CategoryProductForm({
  formData,
  setFormData,
  enabledFields,
  productType,
}: CategoryProductFormProps) {
  const isFieldEnabled = (field: string) => enabledFields.includes(field);

  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Options</h2>
      
      {/* Frame/Sunglasses Fields */}
      {(productType === 'frame' || productType === 'sunglasses') && (
        <div className="space-y-4">
          {isFieldEnabled('frame_shape') && (
            <Input
              label="Frame Shape"
              value={formData.frame_shape || ''}
              onChange={(e) => setFormData({ ...formData, frame_shape: e.target.value })}
            />
          )}
          
          {isFieldEnabled('frame_material') && (
            <Input
              label="Frame Material"
              value={formData.frame_material || ''}
              onChange={(e) => setFormData({ ...formData, frame_material: e.target.value })}
            />
          )}
          
          {isFieldEnabled('frame_color') && (
            <Input
              label="Frame Color"
              value={formData.frame_color || ''}
              onChange={(e) => setFormData({ ...formData, frame_color: e.target.value })}
            />
          )}
          
          {isFieldEnabled('gender') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
              >
                <option value="unisex">Unisex</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="kids">Kids</option>
              </select>
            </div>
          )}
          
          {isFieldEnabled('lens_type') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Lens Type
              </label>
              <textarea
                value={formData.lens_type || ''}
                onChange={(e) => setFormData({ ...formData, lens_type: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                rows={2}
              />
            </div>
          )}
          
          {isFieldEnabled('lens_index_options') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Lens Index Options (comma-separated)
              </label>
              <textarea
                value={Array.isArray(formData.lens_index_options) ? formData.lens_index_options.join(', ') : (formData.lens_index_options || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  const options = value.split(',').map(v => v.trim()).filter(v => v);
                  setFormData({ ...formData, lens_index_options: options });
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                rows={2}
                placeholder="1.5, 1.6, 1.67, 1.74"
              />
            </div>
          )}
          
          {isFieldEnabled('treatment_options') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Treatment Options (comma-separated)
              </label>
              <textarea
                value={Array.isArray(formData.treatment_options) ? formData.treatment_options.join(', ') : (formData.treatment_options || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  const options = value.split(',').map(v => v.trim()).filter(v => v);
                  setFormData({ ...formData, treatment_options: options });
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                rows={2}
                placeholder="Anti-reflective, Blue light, UV protection"
              />
            </div>
          )}
          
          {isFieldEnabled('model_3d_url') && (
            <Input
              label="3D Model URL"
              value={formData.model_3d_url || ''}
              onChange={(e) => setFormData({ ...formData, model_3d_url: e.target.value })}
              placeholder="https://example.com/model.glb"
            />
          )}
          
          {isFieldEnabled('try_on_image') && (
            <Input
              label="Try-On Image URL"
              value={formData.try_on_image || ''}
              onChange={(e) => setFormData({ ...formData, try_on_image: e.target.value })}
              placeholder="https://example.com/try-on.jpg"
            />
          )}
          
          {isFieldEnabled('color_images') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Color Images (URLs, one per line)
              </label>
              <textarea
                value={Array.isArray(formData.color_images) ? formData.color_images.join('\n') : ''}
                onChange={(e) => {
                  const urls = e.target.value.split('\n').filter(url => url.trim());
                  setFormData({ ...formData, color_images: urls });
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                rows={4}
                placeholder="https://example.com/color1.jpg&#10;https://example.com/color2.jpg"
              />
            </div>
          )}
        </div>
      )}

      {/* Contact Lens Fields */}
      {productType === 'contact_lens' && (
        <div className="space-y-4">
          {isFieldEnabled('contact_lens_brand') && (
            <Input
              label="Contact Lens Brand"
              value={formData.contact_lens_brand || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_brand: e.target.value })}
            />
          )}
          
          {isFieldEnabled('contact_lens_type') && (
            <Input
              label="Contact Lens Type"
              value={formData.contact_lens_type || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_type: e.target.value })}
            />
          )}
          
          {isFieldEnabled('contact_lens_color') && (
            <Input
              label="Contact Lens Color"
              value={formData.contact_lens_color || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_color: e.target.value })}
            />
          )}
          
          {isFieldEnabled('contact_lens_material') && (
            <Input
              label="Contact Lens Material"
              value={formData.contact_lens_material || ''}
              onChange={(e) => setFormData({ ...formData, contact_lens_material: e.target.value })}
            />
          )}
          
          {isFieldEnabled('replacement_frequency') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Replacement Frequency
              </label>
              <select
                value={formData.replacement_frequency || ''}
                onChange={(e) => setFormData({ ...formData, replacement_frequency: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
              >
                <option value="">Select Frequency</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}
          
          {isFieldEnabled('water_content') && (
            <Input
              label="Water Content (%)"
              value={formData.water_content || ''}
              onChange={(e) => setFormData({ ...formData, water_content: e.target.value })}
              placeholder="e.g., 38%, 55%"
            />
          )}
          
          {isFieldEnabled('base_curve_options') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Base Curve Options (comma-separated)
              </label>
              <textarea
                value={Array.isArray(formData.base_curve_options) ? formData.base_curve_options.join(', ') : (formData.base_curve_options || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  const options = value.split(',').map(v => v.trim()).filter(v => v);
                  setFormData({ ...formData, base_curve_options: options });
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                rows={2}
                placeholder="8.6, 8.7, 8.8"
              />
            </div>
          )}
          
          {isFieldEnabled('diameter_options') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Diameter Options (comma-separated)
              </label>
              <textarea
                value={Array.isArray(formData.diameter_options) ? formData.diameter_options.join(', ') : (formData.diameter_options || '')}
                onChange={(e) => {
                  const value = e.target.value;
                  const options = value.split(',').map(v => v.trim()).filter(v => v);
                  setFormData({ ...formData, diameter_options: options });
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                rows={2}
                placeholder="14.0, 14.2, 14.5"
              />
            </div>
          )}
          
          {isFieldEnabled('powers_range') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Powers Range (JSON or text)
              </label>
              <textarea
                value={formData.powers_range || ''}
                onChange={(e) => setFormData({ ...formData, powers_range: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
                rows={3}
                placeholder='{"min": -10.0, "max": 10.0, "step": 0.25}'
              />
            </div>
          )}
          
          {isFieldEnabled('has_uv_filter') && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.has_uv_filter || false}
                onChange={(e) => setFormData({ ...formData, has_uv_filter: e.target.checked })}
                className="mr-2"
              />
              <span>Has UV Filter</span>
            </label>
          )}
          
          {isFieldEnabled('can_sleep_with') && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.can_sleep_with || false}
                onChange={(e) => setFormData({ ...formData, can_sleep_with: e.target.checked })}
                className="mr-2"
              />
              <span>Can Sleep With (Extended Wear)</span>
            </label>
          )}
          
          {isFieldEnabled('is_medical_device') && (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.is_medical_device !== false}
                onChange={(e) => setFormData({ ...formData, is_medical_device: e.target.checked })}
                className="mr-2"
              />
              <span>Medical Device (Requires Prescription)</span>
            </label>
          )}
        </div>
      )}

      {/* Eye Hygiene Fields */}
      {productType === 'eye_hygiene' && (
        <div className="space-y-4">
          {isFieldEnabled('size_volume') && (
            <Input
              label="Size/Volume"
              value={formData.size_volume || ''}
              onChange={(e) => setFormData({ ...formData, size_volume: e.target.value })}
              placeholder="e.g., 100ml, 200ml, 500ml"
            />
          )}
          
          {isFieldEnabled('pack_type') && (
            <Input
              label="Pack Type"
              value={formData.pack_type || ''}
              onChange={(e) => setFormData({ ...formData, pack_type: e.target.value })}
              placeholder="e.g., Single, Multi-pack, Bulk"
            />
          )}
          
          {isFieldEnabled('expiry_date') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Expiry Date
              </label>
              <Input
                type="date"
                value={formData.expiry_date || ''}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>
          )}
        </div>
      )}

      {/* Accessory Fields */}
      {productType === 'accessory' && (
        <div className="space-y-4">
          {isFieldEnabled('gender') && (
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-2">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
              >
                <option value="unisex">Unisex</option>
                <option value="men">Men</option>
                <option value="women">Women</option>
                <option value="kids">Kids</option>
              </select>
            </div>
          )}
        </div>
      )}

      {/* MM Calibers (if enabled) */}
      {isFieldEnabled('mm_calibers') && (
        <div className="mt-4">
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            MM Calibers (JSON)
          </label>
          <textarea
            value={typeof formData.mm_calibers === 'string' ? formData.mm_calibers : JSON.stringify(formData.mm_calibers || {})}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setFormData({ ...formData, mm_calibers: parsed });
              } catch {
                setFormData({ ...formData, mm_calibers: e.target.value });
              }
            }}
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-md"
            rows={4}
            placeholder='{"width": 54, "bridge": 18, "temple": 140}'
          />
        </div>
      )}
    </div>
  );
}
