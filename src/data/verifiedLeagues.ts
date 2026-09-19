export type LeagueSeed = {
  id: string
  country: string
  division: number
  teams: string[]
}

export const verifiedLeagueSeeds: LeagueSeed[] = [
  {
    id:'eng-1',country:'Inglaterra',division:1,
    teams:['Arsenal FC','Coventry City FC','Hull City AFC','Manchester United FC','Ipswich Town FC','Sunderland AFC','Nottingham Forest FC','Leeds United FC','Everton FC','Crystal Palace FC','Brentford FC','Tottenham Hotspur FC','Manchester City FC','AFC Bournemouth','Brighton & Hove Albion FC','Aston Villa FC','Newcastle United FC','Liverpool FC','Fulham FC','Chelsea FC']
  },
  {
    id:'eng-2',country:'Inglaterra',division:2,
    teams:['Wolverhampton Wanderers FC','Blackburn Rovers FC','Bolton Wanderers FC','Preston North End FC','Norwich City FC','West Bromwich Albion FC','Bristol City FC','Millwall FC','Middlesbrough FC','Lincoln City FC','Stoke City FC','Swansea City AFC','Charlton Athletic FC','Derby County FC','Portsmouth FC','Queens Park Rangers FC','Sheffield United FC','Birmingham City FC','Watford FC','Southampton FC','Burnley FC','West Ham United FC','Cardiff City FC','Wrexham AFC']
  },
  {
    id:'esp-1',country:'España',division:1,
    teams:['Deportivo Alavés','Getafe CF','Sevilla FC','Rayo Vallecano de Madrid','Real Racing Club de Santander','Villarreal CF','RCD Espanyol de Barcelona','Levante UD','RC Deportivo La Coruña','Elche CF','Club Atlético de Madrid','Málaga CF','Real Betis Balompié','Real Sociedad de Fútbol','Athletic Club','Valencia CF','RC Celta de Vigo','Real Madrid CF','FC Barcelona','CA Osasuna']
  },
  {
    id:'esp-2',country:'España',division:2,
    teams:['Burgos CF','Cultural Leonesa','Real Valladolid','AD Ceuta FC','Racing Santander','CD Castellón','Málaga CF','SD Eibar','Granada CF','Deportivo La Coruña','Real Sociedad B','Real Zaragoza','Cádiz CF','CD Mirandés','SD Huesca','CD Leganés','UD Las Palmas','FC Andorra','Sporting Gijón','Córdoba CF','UD Almería','Albacete']
  },
  {
    id:'deu-1',country:'Alemania',division:1,
    teams:['FC Bayern München','VfB Stuttgart','RB Leipzig','Borussia Mönchengladbach','1. FSV Mainz 05','SC Paderborn 07','1. FC Union Berlin','Eintracht Frankfurt','SV 07 Elversberg','Bayer 04 Leverkusen','1. FC Köln','TSG 1899 Hoffenheim','Borussia Dortmund','Hamburger SV','SC Freiburg','SV Werder Bremen','FC Augsburg','FC Schalke 04']
  },
  {
    id:'deu-2',country:'Alemania',division:2,
    teams:['FC Schalke 04','Hertha BSC','SV 07 Elversberg','1. FC Nürnberg','SC Paderborn 07','Holstein Kiel','Karlsruher SC','Preußen Münster','SV Darmstadt 98','VfL Bochum','Arminia Bielefeld','Fortuna Düsseldorf','1. FC Magdeburg','Eintracht Braunschweig','Hannover 96','1. FC Kaiserslautern','SpVgg Greuther Fürth','Dynamo Dresden']
  },
  {
    id:'ita-1',country:'Italia',division:1,
    teams:['Udinese Calcio','Como 1907','FC Internazionale Milano','AC Monza','Genoa CFC','SSC Napoli','Parma Calcio 1913','Cagliari Calcio','Frosinone Calcio','Juventus FC','Venezia FC','US Lecce','Atalanta BC','US Sassuolo Calcio','Torino FC','AC Milan','Bologna FC 1909','SS Lazio','AS Roma','ACF Fiorentina']
  },
  {
    id:'ita-2',country:'Italia',division:2,
    teams:['Delfino Pescara','Cesena FC','Empoli FC','Calcio Padova','Virtus Entella','Juve Stabia','AC Monza','Mantova 1911 SSD','Palermo FC','AC Reggiana 1919','Spezia Calcio','Carrarese Calcio','Venezia FC','SSC Bari','US Catanzaro','FC Südtirol','Frosinone Calcio','US Avellino','Sampdoria','Modena FC']
  },
  {
    id:'fra-1',country:'Francia',division:1,
    teams:['Olympique de Marseille','RC Strasbourg Alsace','Racing Club de Lens','AJ Auxerre','Le Mans FC','Stade Brestois 29','ES Troyes AC','Paris FC','OGC Nice','FC Lorient','Toulouse FC','Olympique Lyonnais','Angers SCO','Lille OSC','Le Havre AC','AS Monaco FC','Stade Rennais FC 1901','Paris Saint-Germain FC']
  },
  {
    id:'fra-2',country:'Francia',division:2,
    teams:['EA Guingamp','Le Mans FC','ESTAC Troyes','Grenoble Foot 38','Pau FC','FC Annecy','Montpellier HSC','Red Star FC','Rodez AF','AS Nancy Lorraine','Stade Lavallois','AS Saint-Étienne','USL Dunkerque','Clermont Foot 63','Amiens SC','Stade de Reims','US Boulogne','SC Bastia']
  },
  {
    id:'por-1',country:'Portugal',division:1,
    teams:['GD Estoril Praia','FC Famalicão','CS Marítimo','Casa Pia AC','Vitória Guimarães','FC Arouca','CF Estrela da Amadora','Sporting Clube de Portugal','FC Porto','FC Alverca','Moreirense FC','Sporting Clube de Braga','Gil Vicente FC','Rio Ave FC','Sport Lisboa e Benfica','Académico de Viseu FC','CD Santa Clara','CD Nacional']
  },
  {
    id:'ned-1',country:'Países Bajos',division:1,
    teams:["SC Cambuur-Leeuwarden","SBV Excelsior","NEC","Telstar 1963","Go Ahead Eagles","Willem II Tilburg","PSV","Fortuna Sittard","AZ","ADO Den Haag","Sparta Rotterdam","Feyenoord Rotterdam","FC Groningen","FC Utrecht","PEC Zwolle","AFC Ajax","SC Heerenveen","FC Twente '65"]
  },
  {
    id:'bel-1',country:'Bélgica',division:1,
    teams:['Royal Antwerp FC','Union Saint-Gilloise','FCV Dender EH','Cercle Brugge','SV Zulte Waregem','KV Mechelen','RAAL La Louviére','Standard Liège','RSC Anderlecht','KVC Westerlo','Oud-Heverlee Leuven','Sporting Charleroi','Club Brugge KV','KRC Genk','Sint-Truidense VV','KAA Gent']
  },
  {
    id:'tur-1',country:'Turquía',division:1,
    teams:['Gaziantep FK','Galatasaray','Samsunspor','Gençlerbirliği','Antalyaspor','Kasımpaşa SK','Çaykur Rizespor','Göztepe','Eyüpspor','Konyaspor','Trabzonspor','Kocaelispor','Fatih Karagümrük','İstanbul Başakşehir','Fenerbahçe','Alanyaspor','Kayserispor','Beşiktaş']
  },
  {
    id:'gre-1',country:'Grecia',division:1,
    teams:['Aris Saloniki','Volos NFC','Olympiakos Piraeus','Asteras Tripolis','Panetolikos','Atromitos','Panathinaikos','OFI Heraklion','AEK Athen','Panserraikos','PAOK Saloniki','AE Lárissa','Levadiakos','AE Kifisias']
  },
  {
    id:'aut-1',country:'Austria',division:1,
    teams:['LASK','Sturm Graz','Wolfsberger AC','SCR Altach','WSG Tirol','TSV Hartberg','SV Ried','RB Salzburg','Rapid Wien','FC Blau Weiß Linz','Grazer AK','Austria Wien']
  }
]

export const sourceNotice = 'Nombres de clubes obtenidos de fuentes de datos de fútbol abiertas; los escudos visuales de LEYENDA son originales y no reproducen escudos oficiales.'
