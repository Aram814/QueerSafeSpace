-- Seed: places that OpenStreetMap volunteers tag as LGBTQ+ friendly in Central Florida / Tampa Bay.
-- Source: OpenStreetMap contributors, ODbL (https://www.openstreetmap.org/copyright).
-- They are inserted as 'unknown' (no safety rating) with source = 'osm'.
-- Run supabase/migrations/20251001150000_listed_places.sql first. Safe to re-run.
--
-- Left out on purpose: a private members-only club, a nudist resort, and a national restaurant
-- chain whose tag has no supporting source.

insert into public.locations
  (name, address, category, safety_rating, latitude, longitude, notes, source, source_id)
values
  ('Disco Pony Nightclub', '1901 North 15th Street, Tampa, FL 33605', 'bar', 'unknown', 27.9611062, -82.4428339, 'Nightclub tagged LGBTQ+ primary. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'node/2641536525'),
  ('Metro Wellness and Community Centers', '1315 East 7th Avenue, Tampa, FL', 'community', 'unknown', 27.9601784, -82.4448627, 'Community and health center tagged LGBTQ+ primary. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'node/3406720271'),
  ('Bradley''s on 7th', '1510 East 7th Avenue, Tampa, FL 33605', 'bar', 'unknown', 27.9603775, -82.4425941, 'Bar tagged LGBTQ+ primary. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'node/3408501630'),
  ('The Castle', '2004 North 16th Street, Tampa, FL 33605', 'bar', 'unknown', 27.9619238, -82.4418931, 'Nightclub tagged LGBTQ+ welcome. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'way/75615709'),
  ('Ravens & Rockers', '14839 North Florida Avenue, Tampa, FL', 'retail', 'unknown', 28.0839885, -82.45906, 'Alternative fashion store with LGBTQ+ welcome signage. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'node/14097668070'),
  ('Enigma', '1110 Central Avenue, St Petersburg, FL', 'bar', 'unknown', 27.7709614, -82.6502257, 'Bar tagged LGBTQ+ welcome. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'node/4460678697'),
  ('Cocktail St Pete', 'Cocktail St Pete, Central Avenue, St Petersburg, FL', 'bar', 'unknown', 27.7713154, -82.6655392, 'Bar tagged LGBTQ+ primary with LGBTQ+ signage. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'way/225035886'),
  ('The Garage On Central', '2729 Central Avenue, St Petersburg, FL 33713', 'bar', 'unknown', 27.7712444, -82.6705125, 'Bar tagged LGBTQ+ primary with LGBTQ+ signage. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'way/305207240'),
  ('Pro Shop Pub', '840 Cleveland Street, Clearwater, FL 33755', 'bar', 'unknown', 27.9658326, -82.7945053, 'Pub tagged LGBTQ+ primary. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'way/525785467'),
  ('7-Eleven (North Belcher Road)', '205 North Belcher Road, Clearwater, FL 33765', 'retail', 'unknown', 27.968353, -82.745479, 'Store tagged LGBTQ+ welcome after a visit by a mapper: pride flag flown, staff wearing ally pins. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'way/253366067'),
  ('Savoy', '1913 North Orange Avenue, Orlando, FL 32804', 'bar', 'unknown', 28.5692423, -81.3725965, 'Bar tagged LGBTQ+ primary. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'node/12924943080'),
  ('The Center Orlando', 'The Center Orlando, Orlando, FL', 'community', 'unknown', 28.5580423, -81.3646059, 'LGBTQ+ community center offering testing and outreach. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'node/13019989671'),
  ('Anthem Orlando', '100 North Orange Avenue, Orlando, FL 32801', 'bar', 'unknown', 28.5437437, -81.3792958, 'Bar tagged LGBTQ+ primary. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'node/13822302589'),
  ('Barcodes', '4453 Edgewater Drive, Orlando, FL 32804', 'bar', 'unknown', 28.5985387, -81.4006866, 'Bar tagged LGBTQ+ primary. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'way/832780758'),
  ('Southern Nights', '375 South Bumby Avenue, Orlando, FL 32803', 'bar', 'unknown', 28.5390683, -81.3515093, 'Bar tagged LGBTQ+ primary. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'way/1380127503'),
  ('Mango''s Tropical Cafe Orlando', '8126 International Drive, Orlando, FL 32819', 'restaurant', 'unknown', 28.448123, -81.4717409, 'Restaurant and club tagged LGBTQ+ welcome. Listing from OpenStreetMap; not yet rated by the community.', 'osm', 'way/140619619')
on conflict (source, source_id) where source_id is not null do nothing;
