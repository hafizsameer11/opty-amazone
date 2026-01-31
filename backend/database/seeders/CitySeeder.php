<?php

namespace Database\Seeders;

use App\Models\City;
use App\Models\State;
use Illuminate\Database\Seeder;

class CitySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Major US Cities
        $this->seedUSCities();
        
        // Major UK Cities
        $this->seedUKCities();
        
        // Major Canadian Cities
        $this->seedCanadianCities();
        
        // Major Australian Cities
        $this->seedAustralianCities();
        
        // Major Indian Cities
        $this->seedIndianCities();
    }

    private function seedUSCities(): void
    {
        $states = [
            'CA' => ['Los Angeles', 'San Francisco', 'San Diego', 'Sacramento', 'San Jose'],
            'NY' => ['New York', 'Buffalo', 'Rochester', 'Albany', 'Syracuse'],
            'TX' => ['Houston', 'Dallas', 'Austin', 'San Antonio', 'Fort Worth'],
            'FL' => ['Miami', 'Tampa', 'Orlando', 'Jacksonville', 'Tallahassee'],
            'IL' => ['Chicago', 'Aurora', 'Naperville', 'Rockford', 'Peoria'],
            'PA' => ['Philadelphia', 'Pittsburgh', 'Allentown', 'Erie', 'Reading'],
            'OH' => ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron'],
            'GA' => ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens'],
            'NC' => ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem'],
            'MI' => ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Lansing'],
        ];

        foreach ($states as $stateCode => $cities) {
            $state = State::where('code', $stateCode)->first();
            if ($state) {
                foreach ($cities as $cityName) {
                    City::updateOrCreate(
                        [
                            'state_id' => $state->id,
                            'name' => $cityName,
                        ]
                    );
                }
            }
        }
    }

    private function seedUKCities(): void
    {
        $england = State::where('code', 'ENG')->first();
        if ($england) {
            $cities = ['London', 'Manchester', 'Birmingham', 'Liverpool', 'Leeds', 'Sheffield', 'Bristol', 'Leicester', 'Coventry', 'Nottingham'];
            foreach ($cities as $cityName) {
                City::updateOrCreate(
                    [
                        'state_id' => $england->id,
                        'name' => $cityName,
                    ]
                );
            }
        }

        $scotland = State::where('code', 'SCT')->first();
        if ($scotland) {
            $cities = ['Edinburgh', 'Glasgow', 'Aberdeen', 'Dundee', 'Inverness'];
            foreach ($cities as $cityName) {
                City::updateOrCreate(
                    [
                        'state_id' => $scotland->id,
                        'name' => $cityName,
                    ]
                );
            }
        }
    }

    private function seedCanadianCities(): void
    {
        $provinces = [
            'ON' => ['Toronto', 'Ottawa', 'Mississauga', 'Brampton', 'Hamilton', 'London', 'Markham', 'Vaughan'],
            'BC' => ['Vancouver', 'Victoria', 'Surrey', 'Burnaby', 'Richmond'],
            'QC' => ['Montreal', 'Quebec City', 'Laval', 'Gatineau', 'Longueuil'],
            'AB' => ['Calgary', 'Edmonton', 'Red Deer', 'Lethbridge', 'St. Albert'],
        ];

        foreach ($provinces as $provinceCode => $cities) {
            $province = State::where('code', $provinceCode)->first();
            if ($province) {
                foreach ($cities as $cityName) {
                    City::updateOrCreate(
                        [
                            'state_id' => $province->id,
                            'name' => $cityName,
                        ]
                    );
                }
            }
        }
    }

    private function seedAustralianCities(): void
    {
        $states = [
            'NSW' => ['Sydney', 'Newcastle', 'Wollongong', 'Albury', 'Wagga Wagga'],
            'VIC' => ['Melbourne', 'Geelong', 'Ballarat', 'Bendigo', 'Shepparton'],
            'QLD' => ['Brisbane', 'Gold Coast', 'Cairns', 'Townsville', 'Toowoomba'],
            'WA' => ['Perth', 'Fremantle', 'Bunbury', 'Geraldton', 'Kalgoorlie'],
            'SA' => ['Adelaide', 'Mount Gambier', 'Whyalla', 'Murray Bridge', 'Port Augusta'],
        ];

        foreach ($states as $stateCode => $cities) {
            $state = State::where('code', $stateCode)->first();
            if ($state) {
                foreach ($cities as $cityName) {
                    City::updateOrCreate(
                        [
                            'state_id' => $state->id,
                            'name' => $cityName,
                        ]
                    );
                }
            }
        }
    }

    private function seedIndianCities(): void
    {
        $states = [
            'MH' => ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad'],
            'DL' => ['New Delhi', 'Delhi'],
            'KA' => ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum'],
            'TN' => ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
            'GJ' => ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
            'UP' => ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad'],
            'WB' => ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
            'RJ' => ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer'],
        ];

        foreach ($states as $stateCode => $cities) {
            $state = State::where('code', $stateCode)->first();
            if ($state) {
                foreach ($cities as $cityName) {
                    City::updateOrCreate(
                        [
                            'state_id' => $state->id,
                            'name' => $cityName,
                        ]
                    );
                }
            }
        }
    }
}
