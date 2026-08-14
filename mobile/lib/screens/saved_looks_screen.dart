import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../models/models.dart';

class SavedLooksScreen extends StatefulWidget {
  const SavedLooksScreen({Key? key}) : super(key: key);

  @override
  _SavedLooksScreenState createState() => _SavedLooksScreenState();
}

class _SavedLooksScreenState extends State<SavedLooksScreen> {
  List<SavedOutfit> _outfits = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadOutfits();
  }

  Future<void> _loadOutfits() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.getSavedOutfits();
      setState(() {
        _outfits = data.map((json) => SavedOutfit.fromJson(json)).toList();
      });
    } catch (e) {
      print(e);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator(color: Colors.white24));
    }

    if (_outfits.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('NO SAVED LOOKS YET.', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 14)),
            const SizedBox(height: 8),
            const Text('Generate and save some outfits to see them here.', style: TextStyle(color: Colors.white54, fontSize: 12)),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _outfits.length,
      itemBuilder: (context, index) {
        final outfit = _outfits[index];
        final imgUrl = outfit.top?.fullImageUrl ?? outfit.bottom?.fullImageUrl ?? '';
        return Container(
          margin: const EdgeInsets.only(bottom: 16),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: const Color(0xFF141416).withOpacity(0.65),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.white.withOpacity(0.1)),
          ),
          child: Row(
            children: [
              if (imgUrl.isNotEmpty)
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: Image.network(imgUrl, width: 60, height: 80, fit: BoxFit.cover),
                ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('${outfit.style} • ${outfit.weather}'.toUpperCase(), style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 12)),
                    const SizedBox(height: 4),
                    Text(outfit.description, style: const TextStyle(color: Colors.white54, fontSize: 10, fontStyle: FontStyle.italic)),
                    const SizedBox(height: 8),
                    Text(outfit.createdAt.toLocal().toString().split('.')[0], style: const TextStyle(color: Colors.white38, fontSize: 10)),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}
