<?php

namespace Database\Seeders;

use App\Models\Country;
use App\Models\State;
use Illuminate\Database\Seeder;

class StateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // United States States
        $usa = Country::where('code', 'USA')->first();
        if ($usa) {
            $usStates = [
                ['name' => 'Alabama', 'code' => 'AL'],
                ['name' => 'Alaska', 'code' => 'AK'],
                ['name' => 'Arizona', 'code' => 'AZ'],
                ['name' => 'Arkansas', 'code' => 'AR'],
                ['name' => 'California', 'code' => 'CA'],
                ['name' => 'Colorado', 'code' => 'CO'],
                ['name' => 'Connecticut', 'code' => 'CT'],
                ['name' => 'Delaware', 'code' => 'DE'],
                ['name' => 'Florida', 'code' => 'FL'],
                ['name' => 'Georgia', 'code' => 'GA'],
                ['name' => 'Hawaii', 'code' => 'HI'],
                ['name' => 'Idaho', 'code' => 'ID'],
                ['name' => 'Illinois', 'code' => 'IL'],
                ['name' => 'Indiana', 'code' => 'IN'],
                ['name' => 'Iowa', 'code' => 'IA'],
                ['name' => 'Kansas', 'code' => 'KS'],
                ['name' => 'Kentucky', 'code' => 'KY'],
                ['name' => 'Louisiana', 'code' => 'LA'],
                ['name' => 'Maine', 'code' => 'ME'],
                ['name' => 'Maryland', 'code' => 'MD'],
                ['name' => 'Massachusetts', 'code' => 'MA'],
                ['name' => 'Michigan', 'code' => 'MI'],
                ['name' => 'Minnesota', 'code' => 'MN'],
                ['name' => 'Mississippi', 'code' => 'MS'],
                ['name' => 'Missouri', 'code' => 'MO'],
                ['name' => 'Montana', 'code' => 'MT'],
                ['name' => 'Nebraska', 'code' => 'NE'],
                ['name' => 'Nevada', 'code' => 'NV'],
                ['name' => 'New Hampshire', 'code' => 'NH'],
                ['name' => 'New Jersey', 'code' => 'NJ'],
                ['name' => 'New Mexico', 'code' => 'NM'],
                ['name' => 'New York', 'code' => 'NY'],
                ['name' => 'North Carolina', 'code' => 'NC'],
                ['name' => 'North Dakota', 'code' => 'ND'],
                ['name' => 'Ohio', 'code' => 'OH'],
                ['name' => 'Oklahoma', 'code' => 'OK'],
                ['name' => 'Oregon', 'code' => 'OR'],
                ['name' => 'Pennsylvania', 'code' => 'PA'],
                ['name' => 'Rhode Island', 'code' => 'RI'],
                ['name' => 'South Carolina', 'code' => 'SC'],
                ['name' => 'South Dakota', 'code' => 'SD'],
                ['name' => 'Tennessee', 'code' => 'TN'],
                ['name' => 'Texas', 'code' => 'TX'],
                ['name' => 'Utah', 'code' => 'UT'],
                ['name' => 'Vermont', 'code' => 'VT'],
                ['name' => 'Virginia', 'code' => 'VA'],
                ['name' => 'Washington', 'code' => 'WA'],
                ['name' => 'West Virginia', 'code' => 'WV'],
                ['name' => 'Wisconsin', 'code' => 'WI'],
                ['name' => 'Wyoming', 'code' => 'WY'],
            ];

            foreach ($usStates as $state) {
                State::updateOrCreate(
                    [
                        'country_id' => $usa->id,
                        'code' => $state['code'],
                    ],
                    [
                        'name' => $state['name'],
                        'code' => $state['code'],
                    ]
                );
            }
        }

        // United Kingdom Countries/Regions
        $uk = Country::where('code', 'GBR')->first();
        if ($uk) {
            $ukRegions = [
                ['name' => 'England', 'code' => 'ENG'],
                ['name' => 'Scotland', 'code' => 'SCT'],
                ['name' => 'Wales', 'code' => 'WLS'],
                ['name' => 'Northern Ireland', 'code' => 'NIR'],
            ];

            foreach ($ukRegions as $region) {
                State::updateOrCreate(
                    [
                        'country_id' => $uk->id,
                        'code' => $region['code'],
                    ],
                    [
                        'name' => $region['name'],
                        'code' => $region['code'],
                    ]
                );
            }
        }

        // Canada Provinces
        $canada = Country::where('code', 'CAN')->first();
        if ($canada) {
            $canadaProvinces = [
                ['name' => 'Alberta', 'code' => 'AB'],
                ['name' => 'British Columbia', 'code' => 'BC'],
                ['name' => 'Manitoba', 'code' => 'MB'],
                ['name' => 'New Brunswick', 'code' => 'NB'],
                ['name' => 'Newfoundland and Labrador', 'code' => 'NL'],
                ['name' => 'Northwest Territories', 'code' => 'NT'],
                ['name' => 'Nova Scotia', 'code' => 'NS'],
                ['name' => 'Nunavut', 'code' => 'NU'],
                ['name' => 'Ontario', 'code' => 'ON'],
                ['name' => 'Prince Edward Island', 'code' => 'PE'],
                ['name' => 'Quebec', 'code' => 'QC'],
                ['name' => 'Saskatchewan', 'code' => 'SK'],
                ['name' => 'Yukon', 'code' => 'YT'],
            ];

            foreach ($canadaProvinces as $province) {
                State::updateOrCreate(
                    [
                        'country_id' => $canada->id,
                        'code' => $province['code'],
                    ],
                    [
                        'name' => $province['name'],
                        'code' => $province['code'],
                    ]
                );
            }
        }

        // Australia States
        $australia = Country::where('code', 'AUS')->first();
        if ($australia) {
            $australiaStates = [
                ['name' => 'New South Wales', 'code' => 'NSW'],
                ['name' => 'Victoria', 'code' => 'VIC'],
                ['name' => 'Queensland', 'code' => 'QLD'],
                ['name' => 'Western Australia', 'code' => 'WA'],
                ['name' => 'South Australia', 'code' => 'SA'],
                ['name' => 'Tasmania', 'code' => 'TAS'],
                ['name' => 'Australian Capital Territory', 'code' => 'ACT'],
                ['name' => 'Northern Territory', 'code' => 'NT'],
            ];

            foreach ($australiaStates as $state) {
                State::updateOrCreate(
                    [
                        'country_id' => $australia->id,
                        'code' => $state['code'],
                    ],
                    [
                        'name' => $state['name'],
                        'code' => $state['code'],
                    ]
                );
            }
        }

        // Germany States
        $germany = Country::where('code', 'DEU')->first();
        if ($germany) {
            $germanyStates = [
                ['name' => 'Baden-Württemberg', 'code' => 'BW'],
                ['name' => 'Bavaria', 'code' => 'BY'],
                ['name' => 'Berlin', 'code' => 'BE'],
                ['name' => 'Brandenburg', 'code' => 'BB'],
                ['name' => 'Bremen', 'code' => 'HB'],
                ['name' => 'Hamburg', 'code' => 'HH'],
                ['name' => 'Hesse', 'code' => 'HE'],
                ['name' => 'Lower Saxony', 'code' => 'NI'],
                ['name' => 'Mecklenburg-Vorpommern', 'code' => 'MV'],
                ['name' => 'North Rhine-Westphalia', 'code' => 'NW'],
                ['name' => 'Rhineland-Palatinate', 'code' => 'RP'],
                ['name' => 'Saarland', 'code' => 'SL'],
                ['name' => 'Saxony', 'code' => 'SN'],
                ['name' => 'Saxony-Anhalt', 'code' => 'ST'],
                ['name' => 'Schleswig-Holstein', 'code' => 'SH'],
                ['name' => 'Thuringia', 'code' => 'TH'],
            ];

            foreach ($germanyStates as $state) {
                State::updateOrCreate(
                    [
                        'country_id' => $germany->id,
                        'code' => $state['code'],
                    ],
                    [
                        'name' => $state['name'],
                        'code' => $state['code'],
                    ]
                );
            }
        }

        // India States (Major ones)
        $india = Country::where('code', 'IND')->first();
        if ($india) {
            $indiaStates = [
                ['name' => 'Andhra Pradesh', 'code' => 'AP'],
                ['name' => 'Assam', 'code' => 'AS'],
                ['name' => 'Bihar', 'code' => 'BR'],
                ['name' => 'Delhi', 'code' => 'DL'],
                ['name' => 'Gujarat', 'code' => 'GJ'],
                ['name' => 'Haryana', 'code' => 'HR'],
                ['name' => 'Karnataka', 'code' => 'KA'],
                ['name' => 'Kerala', 'code' => 'KL'],
                ['name' => 'Madhya Pradesh', 'code' => 'MP'],
                ['name' => 'Maharashtra', 'code' => 'MH'],
                ['name' => 'Odisha', 'code' => 'OR'],
                ['name' => 'Punjab', 'code' => 'PB'],
                ['name' => 'Rajasthan', 'code' => 'RJ'],
                ['name' => 'Tamil Nadu', 'code' => 'TN'],
                ['name' => 'Telangana', 'code' => 'TG'],
                ['name' => 'Uttar Pradesh', 'code' => 'UP'],
                ['name' => 'West Bengal', 'code' => 'WB'],
            ];

            foreach ($indiaStates as $state) {
                State::updateOrCreate(
                    [
                        'country_id' => $india->id,
                        'code' => $state['code'],
                    ],
                    [
                        'name' => $state['name'],
                        'code' => $state['code'],
                    ]
                );
            }
        }
    }
}
