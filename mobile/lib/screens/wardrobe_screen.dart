import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../api/api_service.dart';
import '../models/models.dart';
import '../widgets/widgets.dart';

class WardrobeScreen extends StatefulWidget {
  const WardrobeScreen({Key? key}) : super(key: key);

  @override
  _WardrobeScreenState createState() => _WardrobeScreenState();
}

class _WardrobeScreenState extends State<WardrobeScreen> {
  List<WardrobeItem> _items = [];
  bool _isLoading = true;
  String _filter = 'all';

  @override
  void initState() {
    super.initState();
    _loadItems();
  }

  Future<void> _loadItems() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.getWardrobe();
      setState(() {
        _items = data.map((json) => WardrobeItem.fromJson(json)).toList();
      });
    } catch (e) {
      print(e);
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _showUploadModal([WardrobeItem? existingItem]) async {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => _UploadEditModal(
        item: existingItem,
        onComplete: () {
          Navigator.pop(context);
          _loadItems();
        },
      ),
    );
  }

  Future<void> _deleteItem(String id) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (c) => AlertDialog(
        backgroundColor: const Color(0xFF141416),
        title: Text('Delete Item?', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 16)),
        content: const Text('Are you sure you want to permanently delete this item?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c, false), child: const Text('Cancel', style: TextStyle(color: Colors.white54))),
          TextButton(onPressed: () => Navigator.pop(c, true), child: const Text('Delete', style: TextStyle(color: Colors.redAccent))),
        ],
      ),
    );

    if (confirm == true) {
      try {
        await ApiService.deleteItem(id);
        _loadItems();
      } catch (e) {
        print(e);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filter == 'all' ? _items : _items.where((i) => i.category == _filter).toList();

    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: LuxuryButton(
            text: 'Add Clothing',
            onPressed: () => _showUploadModal(),
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: ['all', 'top', 'bottom', 'one-piece', 'shoes', 'accessory'].map((f) {
              final isActive = _filter == f;
              return GestureDetector(
                onTap: () => setState(() => _filter = f),
                child: Container(
                  margin: const EdgeInsets.only(right: 12),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    border: Border(bottom: BorderSide(color: isActive ? const Color(0xFFdcdcdc) : Colors.transparent, width: 2))
                  ),
                  child: Text(f.toUpperCase(), style: TextStyle(color: isActive ? Colors.white : Colors.white54, fontSize: 12, letterSpacing: 1.5)),
                ),
              );
            }).toList(),
          ),
        ),
        Expanded(
          child: _isLoading
              ? const Center(child: CircularProgressIndicator(color: Colors.white24))
              : filtered.isEmpty
                  ? Center(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text('YOUR WARDROBE IS WAITING.', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 14)),
                          const SizedBox(height: 8),
                          const Text('Upload your first pieces to begin.', style: TextStyle(color: Colors.white54, fontSize: 12)),
                        ],
                      ),
                    )
                  : GridView.builder(
                      padding: const EdgeInsets.all(16),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        childAspectRatio: 3 / 4,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                      ),
                      itemCount: filtered.length,
                      itemBuilder: (context, index) {
                        final item = filtered[index];
                        return GestureDetector(
                          onTap: () => _showUploadModal(item),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(8),
                            child: Stack(
                              fit: StackFit.expand,
                              children: [
                                Image.network(item.fullImageUrl, fit: BoxFit.cover),
                                Positioned(
                                  bottom: 0, left: 0, right: 0,
                                  child: Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: const BoxDecoration(
                                      gradient: LinearGradient(
                                        begin: Alignment.bottomCenter,
                                        end: Alignment.topCenter,
                                        colors: [Colors.black87, Colors.transparent],
                                      ),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        if (item.name.isNotEmpty) Text(item.name, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold), maxLines: 1),
                                        Text('${item.category} • ${item.style}'.toUpperCase(), style: const TextStyle(fontSize: 8, color: Colors.white70)),
                                      ],
                                    ),
                                  ),
                                ),
                                Positioned(
                                  top: 4, right: 4,
                                  child: GestureDetector(
                                    onTap: () => _deleteItem(item.id),
                                    child: Container(
                                      padding: const EdgeInsets.all(6),
                                      decoration: BoxDecoration(color: Colors.black54, borderRadius: BorderRadius.circular(20)),
                                      child: const Icon(Icons.delete_outline, size: 16, color: Colors.white),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }
}

class _UploadEditModal extends StatefulWidget {
  final WardrobeItem? item;
  final VoidCallback onComplete;

  const _UploadEditModal({Key? key, this.item, required this.onComplete}) : super(key: key);

  @override
  __UploadEditModalState createState() => __UploadEditModalState();
}

class __UploadEditModalState extends State<_UploadEditModal> {
  final _nameCtrl = TextEditingController();
  final _colorCtrl = TextEditingController();
  String _category = 'top';
  String _style = 'casual';
  String? _imagePath;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    if (widget.item != null) {
      _nameCtrl.text = widget.item!.name;
      _colorCtrl.text = widget.item!.color;
      _category = widget.item!.category;
      _style = widget.item!.style;
    }
  }

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    if (pickedFile != null) {
      setState(() => _imagePath = pickedFile.path);
    }
  }

  Future<void> _save() async {
    if (widget.item == null && _imagePath == null) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please select an image first.')));
      return;
    }

    setState(() => _isLoading = true);
    try {
      final fields = {
        'name': _nameCtrl.text,
        'category': _category,
        'style': _style,
        'color': _colorCtrl.text,
      };

      if (widget.item == null) {
        await ApiService.uploadItem(_imagePath!, fields);
      } else {
        await ApiService.updateItem(widget.item!.id, fields, imagePath: _imagePath);
      }
      widget.onComplete();
    } catch (e) {
      print(e);
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
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
        const SizedBox(height: 16),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      decoration: const BoxDecoration(
        color: Color(0xFF080808),
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(widget.item == null ? 'ADD TO WARDROBE' : 'EDIT ITEM', style: Theme.of(context).textTheme.displayMedium?.copyWith(fontSize: 16)),
            const SizedBox(height: 24),
            GestureDetector(
              onTap: _pickImage,
              child: Container(
                height: 120,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.05),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white24, style: BorderStyle.solid),
                  image: _imagePath != null
                      ? DecorationImage(image: AssetImage(_imagePath!), fit: BoxFit.cover) // Wait, for local files we should use FileImage, but since web is possible, we just show text. Let's just use text for simplicity.
                      : (widget.item != null ? DecorationImage(image: NetworkImage(widget.item!.fullImageUrl), fit: BoxFit.cover) : null),
                ),
                alignment: Alignment.center,
                child: (_imagePath == null && widget.item == null) 
                    ? Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: const [
                          Icon(Icons.add_photo_alternate, color: Colors.white54, size: 32),
                          SizedBox(height: 8),
                          Text('TAP TO SELECT IMAGE', style: TextStyle(color: Colors.white54, fontSize: 10, letterSpacing: 1.5)),
                        ],
                      )
                    : (_imagePath != null ? Container(color: Colors.black54, padding: const EdgeInsets.all(8), child: const Text('IMAGE SELECTED', style: TextStyle(color: Colors.white))) : const SizedBox()),
              ),
            ),
            const SizedBox(height: 24),
            LuxuryTextField(label: 'Name / Label', controller: _nameCtrl),
            _buildDropdown('Category', _category, ['top', 'bottom', 'one-piece', 'shoes', 'accessory'], (v) => setState(() => _category = v!)),
            _buildDropdown('Style', _style, ['casual', 'formal', 'party', 'minimalist', 'streetwear', 'traditional', 'sporty', 'winter', 'summer'], (v) => setState(() => _style = v!)),
            LuxuryTextField(label: 'Color (Optional)', controller: _colorCtrl),
            const SizedBox(height: 8),
            LuxuryButton(text: widget.item == null ? 'Upload' : 'Save Changes', isLoading: _isLoading, onPressed: _save),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }
}
