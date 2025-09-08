-- Supabase Database Schema for Ponca City United FC
-- Run these SQL commands in the Supabase SQL Editor

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  jersey_number INTEGER NOT NULL UNIQUE,
  position VARCHAR(50) NOT NULL,
  birth_year INTEGER NOT NULL,
  photo_url TEXT,
  description TEXT,
  strengths TEXT[], -- Array of strings
  areas_to_improve TEXT[], -- Array of strings
  coach_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create player_stats table
CREATE TABLE IF NOT EXISTS player_stats (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  yellow_cards INTEGER DEFAULT 0,
  red_cards INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  clean_sheets INTEGER DEFAULT 0,
  season VARCHAR(20) DEFAULT '2024-2025',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(player_id, season)
);

-- Create highlights table
CREATE TABLE IF NOT EXISTS highlights (
  id BIGSERIAL PRIMARY KEY,
  player_id BIGINT REFERENCES players(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  highlight_date DATE NOT NULL,
  type VARCHAR(20) CHECK (type IN ('goal', 'assist', 'save', 'defense', 'performance', 'multiple')) NOT NULL,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_players_updated_at ON players;
CREATE TRIGGER update_players_updated_at
    BEFORE UPDATE ON players
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_player_stats_updated_at ON player_stats;
CREATE TRIGGER update_player_stats_updated_at
    BEFORE UPDATE ON player_stats
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_highlights_updated_at ON highlights;
CREATE TRIGGER update_highlights_updated_at
    BEFORE UPDATE ON highlights
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample players (optional - you can remove this if you don't want sample data)
INSERT INTO players (name, jersey_number, position, birth_year, photo_url, description, strengths, areas_to_improve, coach_notes) VALUES
('Alex Johnson', 10, 'Forward', 2016, '/players/alex-johnson.png', 'Dynamic forward with excellent ball control and finishing ability. Shows great promise with natural goal-scoring instinct.', 
 ARRAY['Clinical finishing', 'Ball control', 'Speed', 'Positioning'], 
 ARRAY['Passing accuracy', 'Defensive work rate'], 
 'Alex has shown tremendous improvement this season. Natural goal scorer with great instincts in the box.'),

('Sam Rodriguez', 7, 'Midfielder', 2017, '/players/sam-rodriguez.png', 'Creative midfielder with great passing vision and work rate.',
 ARRAY['Vision', 'Passing accuracy', 'Work rate', 'Team play'],
 ARRAY['Shooting power', 'Aerial ability'],
 'Sam is the engine of our midfield. Excellent decision-making and always puts the team first.'),

('Jordan Smith', 3, 'Defender', 2016, '/players/jordan-smith.png', 'Solid defender with strong tackling and leadership qualities.',
 ARRAY['Tackling', 'Leadership', 'Aerial ability', 'Communication'],
 ARRAY['Pace', 'Ball distribution'],
 'Jordan is a natural leader on the field. Solid defender who organizes the backline well.'),

('Casey Williams', 1, 'Goalkeeper', 2016, '/players/casey-williams.png', 'Reliable goalkeeper with quick reflexes and great communication.',
 ARRAY['Reflexes', 'Communication', 'Distribution', 'Positioning'],
 ARRAY['Coming for crosses', 'Footwork'],
 'Casey is incredibly reliable between the posts. Great shot-stopper with excellent distribution.'),

('Taylor Brown', 11, 'Winger', 2017, '/players/taylor-brown.png', 'Speedy winger with excellent dribbling skills and crossing ability.',
 ARRAY['Pace', 'Dribbling', 'Crossing', '1v1 situations'],
 ARRAY['Final ball', 'Defensive tracking'],
 'Taylor brings excitement to our attack. Natural winger with great pace and skill on the ball.'),

('Riley Davis', 8, 'Midfielder', 2016, '/players/riley-davis.png', 'Versatile midfielder who can play both defensive and attacking roles.',
 ARRAY['Versatility', 'Long shots', 'Work rate', 'Ball winning'],
 ARRAY['Consistency', 'Set piece delivery'],
 'Riley is our Swiss Army knife - can play anywhere in midfield and always gives 100%.');

-- Insert sample player stats
INSERT INTO player_stats (player_id, goals, assists, games_played, yellow_cards, red_cards, saves, clean_sheets) VALUES
(1, 12, 8, 15, 1, 0, 0, 0),
(2, 5, 12, 16, 0, 0, 0, 0),
(3, 2, 4, 14, 2, 0, 0, 6),
(4, 0, 1, 12, 0, 0, 45, 7),
(5, 8, 6, 13, 0, 0, 0, 0),
(6, 6, 9, 15, 1, 0, 0, 0);

-- Insert sample highlights
INSERT INTO highlights (player_id, title, description, highlight_date, type) VALUES
(1, 'Amazing Goal vs Thunder FC', null, '2024-03-15', 'goal'),
(1, 'Hat-trick Performance', null, '2024-02-28', 'multiple'),
(1, 'Winning Goal in Tournament Final', null, '2024-01-20', 'goal'),
(2, 'Perfect Through Ball Assist', null, '2024-03-10', 'assist'),
(2, 'Midfield Masterclass', null, '2024-02-15', 'performance'),
(3, 'Last-minute Goal Line Clearance', null, '2024-03-05', 'defense'),
(4, 'Penalty Save in Final', null, '2024-03-20', 'save'),
(4, 'Double Save vs Lightning FC', null, '2024-02-18', 'save'),
(4, 'Clean Sheet Streak', null, '2024-01-15', 'performance'),
(4, 'Long Range Assist', null, '2024-01-08', 'assist'),
(5, 'Solo Run and Finish', null, '2024-03-12', 'goal'),
(5, 'Perfect Cross for Winning Goal', null, '2024-02-25', 'assist'),
(6, 'Long Range Screamer', null, '2024-03-08', 'goal'),
(6, 'Box-to-Box Performance', null, '2024-02-20', 'performance'),
(6, 'Crucial Defensive Block', null, '2024-01-30', 'defense');

-- Enable Row Level Security (RLS) - optional but recommended
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE highlights ENABLE ROW LEVEL SECURITY;

-- Create policies to allow read access to everyone (you can modify these as needed)
CREATE POLICY "Allow read access to players" ON players FOR SELECT USING (true);
CREATE POLICY "Allow read access to player_stats" ON player_stats FOR SELECT USING (true);
CREATE POLICY "Allow read access to highlights" ON highlights FOR SELECT USING (true);

-- Create policies to allow insert/update/delete for authenticated users (you can modify these as needed)
CREATE POLICY "Allow all operations on players for authenticated users" ON players FOR ALL USING (true);
CREATE POLICY "Allow all operations on player_stats for authenticated users" ON player_stats FOR ALL USING (true);
CREATE POLICY "Allow all operations on highlights for authenticated users" ON highlights FOR ALL USING (true);