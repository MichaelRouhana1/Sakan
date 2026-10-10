// Housing fixtures only. Academic/campus/tuition/benefit catalogs stay separate.
export const sharedDefaults = {
 electricity:'generator_24_7',electricity_cuts_start:null,electricity_cuts_end:null,
 electricity_hours_on:24,electricity_cut_windows:[],water:'state_well_24_7',
 wifi_included:true,router_ups:true,elevator_24_7:true,has_elevator:true,has_solar:false,
 generator_amperes:10,generator_included:true,concierge_included:true,cooking_gas_included:false,
 water_bill_included:true,building_fees_included:true,parking_included_in_rent:false,
 amenities:['washer','fridge','microwave'],smoking_policy:'balcony_only',pets_policy:'no',
 guests_policy:'restricted',quiet_hours:true,target_audience:'students_professionals',
};
const whole=(key,title,rent,size,extra={})=>({key,title,rent,size,type:'whole_apartment',bedrooms:2,beds:2,bathrooms:1,privacy:'private',floor:2,...extra});
const room=(key,title,rent,size,extra={})=>({key,title,rent,size,type:'private_room',bedrooms:1,beds:1,bathrooms:1,privacy:'shared',floor:3,...extra});
export const housingFixtures=[
 {key:'hamra-single',kind:'apartment',area:'Hamra',city:'Beirut',campus:'aub',lng:35.4814,lat:33.8958,address:'Makdissi Street',units:[
  whole('home','Sunny apartment near AUB',850,95,{promotion:'featured'})]},
 {key:'jbeil-single',kind:'apartment',area:'Jbeil',city:'Jbeil',campus:'lau-jbeil',lng:35.6844,lat:34.1196,address:'Blat, near LAU',shared:{electricity:'solar',has_solar:true,generator_amperes:5},units:[
  whole('home','Furnished apartment in Blat',600,80,{promotion:'bump'})]},
 {key:'achrafieh-rooms',kind:'apartment',area:'Achrafieh',city:'Beirut',campus:'usj-huvelin',lng:35.5081,lat:33.8884,address:'Monnot Street',units:[
  room('east','East room near Huvelin',280,12),room('west','West room with study desk',320,16),
  room('balcony','Room with private balcony',370,20,{amenities:['balcony','study_desk']}),
  room('ensuite','Large room with private bathroom',440,25,{privacy:'private'})]},
 {key:'achrafieh-building',kind:'building',area:'Achrafieh',city:'Beirut',campus:'usj-csm',lng:35.519,lat:33.885,address:'Sassine side street',shared:{amenities:['parking','washer','fridge'],parking_included_in_rent:true},units:[
  whole('first','First-floor apartment near USJ',750,85,{floor:1}),
  whole('second','Second-floor apartment with solar',900,105,{floor:2,overrides:{electricity:'solar',has_solar:true,generator_amperes:null,generator_included:false,wifi_included:false}}),
  whole('third','Third-floor family apartment',1100,135,{floor:3,bedrooms:3,beds:3})]},
 {key:'hamra-female-beds',kind:'apartment',area:'Hamra',city:'Beirut',campus:'aub',lng:35.4822,lat:33.897,address:'Makhoul Street',shared:{target_audience:'students_only'},units:[
  {key:'shared',title:'Female shared room near AUB',type:'shared_bed',rent:190,size:22,bedrooms:1,beds:3,available:1,gender:'female_only',bathrooms:1,privacy:'shared',floor:1}]},
 {key:'jbeil-shared-beds',kind:'apartment',area:'Jbeil',city:'Jbeil',campus:'lau-jbeil',lng:35.6819,lat:34.117,address:'Blat student residence',shared:{electricity:'scheduled_cuts',electricity_cuts_start:'02:00',electricity_cuts_end:'06:00',electricity_cut_windows:[{start:'02:00',end:'06:00'}],electricity_hours_on:20,water:'tank_delivery',water_bill_included:false,elevator_24_7:false},units:[
  {key:'shared',title:'Shared room in Blat',type:'shared_bed',rent:160,size:28,bedrooms:1,beds:4,available:2,gender:'any',bathrooms:1,privacy:'shared',floor:2}]},
 {key:'hamra-whole-and-rooms',kind:'apartment',area:'Hamra',city:'Beirut',campus:'lau-beirut',lng:35.4808,lat:33.89,address:'Sadat Street',units:[
  whole('whole','Whole two-bedroom apartment in Hamra',800,90),
  room('room-one','Hamra room with desk',350,16),room('room-two','Hamra room with balcony',400,21,{amenities:['balcony']})]},
 {key:'kaslik-expired',kind:'apartment',area:'Kaslik',city:'Jounieh',campus:'usek-kaslik',lng:35.6195,lat:33.9808,address:'Kaslik main road',units:[
  whole('home','Expired Kaslik apartment example',650,75,{expired:true})]},
 {key:'saida-rented',kind:'apartment',area:'Saida',city:'Saida',campus:'usj-cls',lng:35.3869,lat:33.559,address:'Abra Road',units:[
  whole('home','Rented Saida apartment example',420,85,{availability:'rented'})]},
 {key:'tripoli-pending',kind:'apartment',area:'Tripoli',city:'Tripoli',campus:'bau-tripoli',lng:35.8435,lat:34.399,address:'Dam w Farez',units:[
  whole('home','Under-offer Tripoli apartment',450,90,{availability:'pending'})]},
];

