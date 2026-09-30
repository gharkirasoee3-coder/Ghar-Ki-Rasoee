const MenuModel = require('../src/models/menu.model');

describe('City Selection, Pricing & Delivery Matching Architecture', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('MenuModel.getCityCategory', () => {
    it('should return "local" for local cities regardless of casing', async () => {
      expect(await MenuModel.getCityCategory('Vancouver')).toBe('local');
      expect(await MenuModel.getCityCategory('burnaby')).toBe('local');
      expect(await MenuModel.getCityCategory('PORT COQUITLAM')).toBe('local');
      expect(await MenuModel.getCityCategory('Delta')).toBe('local');
    });

    it('should return "far" for far cities', async () => {
      expect(await MenuModel.getCityCategory('Abbotsford')).toBe('far');
      expect(await MenuModel.getCityCategory('chilliwack')).toBe('far');
      expect(await MenuModel.getCityCategory('Mission')).toBe('far');
    });

    it('should return null for unsupported cities', async () => {
      expect(await MenuModel.getCityCategory('Toronto')).toBeNull();
      expect(await MenuModel.getCityCategory('Calgary')).toBeNull();
      expect(await MenuModel.getCityCategory('Kelowna')).toBeNull();
      expect(await MenuModel.getCityCategory('')).toBeNull();
      expect(await MenuModel.getCityCategory(null)).toBeNull();
    });
  });

  describe('MenuModel.matchAddressToCity', () => {
    it('should match address containing local city', async () => {
      const match = await MenuModel.matchAddressToCity('123 Kingsway, Burnaby, BC V5H 4V8');
      expect(match).not.toBeNull();
      expect(match.city).toBe('Burnaby');
      expect(match.categoryKey).toBe('local');
    });

    it('should match address containing far city', async () => {
      const match = await MenuModel.matchAddressToCity('456 South Fraser Way, Abbotsford, BC V2T 1W6');
      expect(match).not.toBeNull();
      expect(match.city).toBe('Abbotsford');
      expect(match.categoryKey).toBe('far');
    });

    it('should prioritize multi-word city "Port Coquitlam" over "Coquitlam"', async () => {
      const match = await MenuModel.matchAddressToCity('2100 Mary Hill Rd, Port Coquitlam, BC');
      expect(match).not.toBeNull();
      expect(match.city).toBe('Port Coquitlam');
      expect(match.categoryKey).toBe('local');
    });

    it('should return null for out of province addresses', async () => {
      const match1 = await MenuModel.matchAddressToCity('100 Queen St W, Toronto, ON M5H 2N2');
      expect(match1).toBeNull();

      const match2 = await MenuModel.matchAddressToCity('800 8 Ave SW, Calgary, AB T2P 2V2');
      expect(match2).toBeNull();
    });

    it('should return null for unsupported cities in BC', async () => {
      const match = await MenuModel.matchAddressToCity('1600 Ellis St, Kelowna, BC V1Y 2A8');
      expect(match).toBeNull();
    });
  });

  describe('MenuModel.validateDeliveryAddress', () => {
    it('should accept valid matching local address', async () => {
      const validation = await MenuModel.validateDeliveryAddress('100 Hastings St, Vancouver, BC', 'Vancouver');
      expect(validation.valid).toBe(true);
      expect(validation.matchedCity).toBe('Vancouver');
      expect(validation.categoryKey).toBe('local');
    });

    it('should accept when claimed city and address city are different but belong to the SAME category tier', async () => {
      // User selected Vancouver (local) but entered an address in Burnaby (local)
      const validation = await MenuModel.validateDeliveryAddress('123 Kingsway, Burnaby, BC', 'Vancouver');
      expect(validation.valid).toBe(true);
      expect(validation.categoryMismatch).toBe(false);
      expect(validation.categoryKey).toBe('local');
    });

    it('should flag categoryMismatch when claimed city is local but address is in far city', async () => {
      // User selected Vancouver (local) but entered Surrey (far)
      const validation = await MenuModel.validateDeliveryAddress('10255 King George Blvd, Surrey, BC', 'Vancouver');
      expect(validation.valid).toBe(false);
      expect(validation.categoryMismatch).toBe(true);
      expect(validation.claimedCategory).toBe('local');
      expect(validation.matchedCategory).toBe('far');
      expect(validation.matchedCity).toBe('Surrey');
    });

    it('should reject address that is not in any supported city', async () => {
      const validation = await MenuModel.validateDeliveryAddress('100 Front St, Toronto, ON', 'Vancouver');
      expect(validation.valid).toBe(false);
      expect(validation.categoryMismatch).toBe(false);
      expect(validation.error).toContain('outside our delivery service area');
    });
  });
});
