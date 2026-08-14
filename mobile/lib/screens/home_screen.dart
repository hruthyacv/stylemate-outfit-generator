import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../models/models.dart';
import '../widgets/widgets.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({Key? key}) : super(key: key);

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _style = 'casual';
  String _weather = 'sunny';
  bool _isLoading = false;
  Map<String, dynamic>? _outfitData;
  String _error = '';

  Future<void> _generate() async {
    setState(() { _isLoading = true; _error = ''; _outfitData = null; });
    try {
      final res = await ApiService.generateOutfit(_style, _weather);
      setState(() => _outfitData = res);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _saveLook() async {
    if (_outfitData == null) return;
    
    final outfit = _outfitData!['outfit'];
    final payload = {
      'top_id': outfit['top']?['id'],
      'bottom_id': outfit['bottom']?['id'],
      'shoes_id': outfit['shoes']?['id'],
      'accessory_id': outfit['accessory']?['id'],
      'style': _style,
      'weather': _weather,
      'description': _outfitData!['ai_suggestion']['description'],
    };

    try {
      await ApiService.saveOutfit(payload);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Outfit saved successfully!'), backgroundColor: Colors.green),
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to save outfit.'), backgroundColor: Colors.red),
      );
    }
  }

  Widget _buildPiece(String label, dynamic itemData) {
    if (itemData == null) return const SizedBox();
    final item = WardrobeItem.fromJson(itemData);
    final isOnePiece = label == 'top' && item.category == 'one-piece';
    final displayLabel = isOnePiece ? 'ONE-PIECE' : label.toUpperCase();

    return Expanded(
      child: AspectRatio(
        aspectRatio: 3 / 4,
        child: Container(
          margin: const EdgeInsets.all(4),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
            image: DecorationImage(
              image: NetworkImage(item.fullImageUrl),
              fit: BoxFit.cover,
            ),
          ),
          child: Stack(
            children: [
              Positioned(
                top: 4, left: 4,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.black.withOpacity(0.7),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(displayLabel, style: const TextStyle(fontSize: 8, color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          LuxuryGlassCard(
            child: Column(
              children: [
                Image.asset('assets/icons/hanger-icon.png', width: 40, height: 40),
                const SizedBox(height: 12),
                Text('YOUR OUTFIT', style: Theme.of(context).textTheme.displayMedium),
                const SizedBox(height: 24),
                _buildDropdown('Occasion / Style', _style, ['casual', 'formal', 'party', 'minimalist'], (v) => setState(() => _style = v!)),
                const SizedBox(height: 16),
                _buildDropdown('Weather', _weather, ['sunny', 'hot', 'rainy', 'cold'], (v) => setState(() => _weather = v!)),
                const SizedBox(height: 24),
                LuxuryButton(text: 'Curate Outfit', isLoading: _isLoading, onPressed: _generate),
              ],
            ),
          ),
          const SizedBox(height: 24),
          if (_error.isNotEmpty) Text(_error, style: const TextStyle(color: Colors.redAccent)),
          if (_outfitData != null) _buildResult(),
        ],
      ),
    );
  }

  Widget _buildDropdown(String label, String value, List<String> options, ValueChanged<String?> onChanged) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label.toUpperCase(), style: const TextStyle(color: Colors.white54, fontSize: 10, letterSpacing: 1.5)),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.05),
            borderRadius: BorderRadius.circular(6),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<String>(
              value: value,
              isExpanded: true,
              dropdownColor: const Color(0xFF141416),
              items: options.map((o) => DropdownMenuItem(value: o, child: Text(o.toUpperCase(), style: const TextStyle(fontSize: 14)))).toList(),
              onChanged: onChanged,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildResult() {
    final outfit = _outfitData!['outfit'];
    final ai = _outfitData!['ai_suggestion'];

    return LuxuryGlassCard(
      child: Column(
        children: [
          Row(
            children: [
              if (outfit['top'] != null) _buildPiece('top', outfit['top']),
              if (outfit['bottom'] != null) _buildPiece('bottom', outfit['bottom']),
            ],
          ),
          Row(
            children: [
              if (outfit['shoes'] != null) _buildPiece('shoes', outfit['shoes']),
              if (outfit['accessory'] != null) _buildPiece('accessory', outfit['accessory']),
            ],
          ),
          const SizedBox(height: 16),
          const Divider(color: Colors.white24),
          const SizedBox(height: 16),
          Text(ai['aesthetic'], style: Theme.of(context).textTheme.displayMedium?.copyWith(color: const Color(0xFFdcdcdc), fontSize: 16), textAlign: TextAlign.center),
          const SizedBox(height: 8),
          Text(ai['description'], style: const TextStyle(color: Colors.white70, fontStyle: FontStyle.italic, fontSize: 12), textAlign: TextAlign.center),
          const SizedBox(height: 16),
          Text('TIP: ${ai['tip']}', style: const TextStyle(color: Colors.white, fontSize: 12), textAlign: TextAlign.center),
          const SizedBox(height: 24),
          LuxuryButton(text: 'Save Look', isPrimary: false, onPressed: _saveLook),
        ],
      ),
    );
  }
}
