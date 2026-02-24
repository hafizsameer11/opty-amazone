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
      <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Product Options</h2>
            <p className="text-indigo-100 mt-1">Category-specific customization options</p>
          </div>
        </div>
      </div>
      <div className="p-8">
      
      {/* Frame/Sunglasses Fields */}
      {(productType === 'frame' || productType === 'sunglasses') && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-6 border-2 border-blue-200 shadow-sm">
            <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
              Frame Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {isFieldEnabled('frame_shape') && (
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <Input
                    label="Frame Shape"
                    value={formData.frame_shape || ''}
                    onChange={(e) => setFormData({ ...formData, frame_shape: e.target.value })}
                    placeholder="e.g., Round, Square, Aviator"
                    className="bg-white"
                  />
                </div>
              )}
              
              {isFieldEnabled('frame_material') && (
                <div className="bg-white rounded-lg p-4 border border-indigo-100">
                  <Input
                    label="Frame Material"
                    value={formData.frame_material || ''}
                    onChange={(e) => setFormData({ ...formData, frame_material: e.target.value })}
                    placeholder="e.g., Acetate, Metal, Titanium"
                    className="bg-white"
                  />
                </div>
              )}
              
              {isFieldEnabled('frame_color') && (
                <div className="bg-white rounded-lg p-4 border border-purple-100">
                  <Input
                    label="Frame Color"
                    value={formData.frame_color || ''}
                    onChange={(e) => setFormData({ ...formData, frame_color: e.target.value })}
                    placeholder="e.g., Black, Brown, Tortoise"
                    className="bg-white"
                  />
                </div>
              )}
            </div>
            {isFieldEnabled('gender') && (
              <div className="mt-5 bg-white rounded-lg p-5 border border-blue-200">
                <label className="block text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  Gender
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-4 py-3.5 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-200 focus:border-blue-500 transition-all font-medium text-gray-700 shadow-sm hover:border-blue-300"
                >
                  <option value="unisex">Unisex</option>
                  <option value="men">Men</option>
                  <option value="women">Women</option>
                  <option value="kids">Kids</option>
                </select>
              </div>
            )}
          </div>
          
          {(isFieldEnabled('lens_type') || isFieldEnabled('lens_index_options') || isFieldEnabled('treatment_options')) && (
            <div className="bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 rounded-xl p-6 border-2 border-emerald-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                Lens Options
              </h3>
              <div className="space-y-5">
          
                {isFieldEnabled('lens_type') && (
                  <div className="bg-white rounded-lg p-5 border border-emerald-200">
                    <label className="block text-sm font-bold text-gray-800 mb-3">
                      Lens Type
                    </label>
                    <textarea
                      value={formData.lens_type || ''}
                      onChange={(e) => setFormData({ ...formData, lens_type: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-emerald-200 rounded-xl focus:ring-4 focus:ring-emerald-200 focus:border-emerald-500 transition-all resize-none"
                      rows={2}
                      placeholder="e.g., Single Vision, Progressive, Bifocal"
                    />
                  </div>
                )}
                
                {isFieldEnabled('lens_index_options') && (
                  <div className="bg-white rounded-lg p-5 border border-teal-200">
                    <label className="block text-sm font-bold text-gray-800 mb-3">
                      Lens Index Options
                      <span className="text-gray-400 text-xs font-normal ml-2">(comma-separated)</span>
                    </label>
                    <textarea
                      value={Array.isArray(formData.lens_index_options) ? formData.lens_index_options.join(', ') : (formData.lens_index_options || '')}
                      onChange={(e) => {
                        const value = e.target.value;
                        const options = value.split(',').map(v => v.trim()).filter(v => v);
                        setFormData({ ...formData, lens_index_options: options });
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-teal-200 rounded-xl focus:ring-4 focus:ring-teal-200 focus:border-teal-500 transition-all resize-none"
                      rows={2}
                      placeholder="1.5, 1.6, 1.67, 1.74"
                    />
                  </div>
                )}
                
                {isFieldEnabled('treatment_options') && (
                  <div className="bg-white rounded-lg p-5 border border-cyan-200">
                    <label className="block text-sm font-bold text-gray-800 mb-3">
                      Treatment Options
                      <span className="text-gray-400 text-xs font-normal ml-2">(comma-separated)</span>
                    </label>
                    <textarea
                      value={Array.isArray(formData.treatment_options) ? formData.treatment_options.join(', ') : (formData.treatment_options || '')}
                      onChange={(e) => {
                        const value = e.target.value;
                        const options = value.split(',').map(v => v.trim()).filter(v => v);
                        setFormData({ ...formData, treatment_options: options });
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-cyan-200 rounded-xl focus:ring-4 focus:ring-cyan-200 focus:border-cyan-500 transition-all resize-none"
                      rows={2}
                      placeholder="Anti-reflective, Blue light, UV protection"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
          
          {(isFieldEnabled('model_3d_url') || isFieldEnabled('try_on_image') || isFieldEnabled('color_images')) && (
            <div className="bg-gradient-to-br from-rose-50 via-pink-50 to-fuchsia-50 rounded-xl p-6 border-2 border-rose-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span className="w-3 h-3 bg-rose-500 rounded-full"></span>
                Visual Assets
              </h3>
              <div className="space-y-5">
          
                {isFieldEnabled('model_3d_url') && (
                  <div className="bg-white rounded-lg p-5 border border-rose-200">
                    <Input
                      label="3D Model URL"
                      value={formData.model_3d_url || ''}
                      onChange={(e) => setFormData({ ...formData, model_3d_url: e.target.value })}
                      placeholder="https://example.com/model.glb"
                      className="bg-white"
                    />
                  </div>
                )}
                
                {isFieldEnabled('try_on_image') && (
                  <div className="bg-white rounded-lg p-5 border border-pink-200">
                    <Input
                      label="Try-On Image URL"
                      value={formData.try_on_image || ''}
                      onChange={(e) => setFormData({ ...formData, try_on_image: e.target.value })}
                      placeholder="https://example.com/try-on.jpg"
                      className="bg-white"
                    />
                  </div>
                )}
                
                {isFieldEnabled('color_images') && (
                  <div className="bg-white rounded-lg p-5 border border-fuchsia-200">
                    <label className="block text-sm font-bold text-gray-800 mb-3">
                      Color Images
                      <span className="text-gray-400 text-xs font-normal ml-2">(URLs, one per line)</span>
                    </label>
                    <textarea
                      value={Array.isArray(formData.color_images) ? formData.color_images.join('\n') : ''}
                      onChange={(e) => {
                        const urls = e.target.value.split('\n').filter(url => url.trim());
                        setFormData({ ...formData, color_images: urls });
                      }}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-fuchsia-200 rounded-xl focus:ring-4 focus:ring-fuchsia-200 focus:border-fuchsia-500 transition-all resize-none"
                      rows={4}
                      placeholder="https://example.com/color1.jpg&#10;https://example.com/color2.jpg"
                    />
                  </div>
                )}
              </div>
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
    </div>
  );
}
