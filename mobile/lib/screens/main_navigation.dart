import 'package:flutter/material.dart';
import '../api/api_service.dart';
import 'home_screen.dart';
import 'wardrobe_screen.dart';
import 'saved_looks_screen.dart';
import 'login_screen.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({Key? key}) : super(key: key);

  @override
  _MainNavigationState createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const HomeScreen(),
    const WardrobeScreen(),
    const SavedLooksScreen(),
  ];

  void _logout() async {
    await ApiService.logout();
    if (!mounted) return;
    Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const LoginScreen()));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          'StyleMate',
          style: Theme.of(context).textTheme.displayLarge?.copyWith(fontSize: 28),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white54, size: 20),
            onPressed: _logout,
          )
        ],
      ),
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        backgroundColor: const Color(0xFF080808),
        selectedItemColor: const Color(0xFFdcdcdc),
        unselectedItemColor: Colors.white24,
        currentIndex: _currentIndex,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.auto_awesome), label: 'Generate'),
          BottomNavigationBarItem(icon: Icon(Icons.checkroom), label: 'Wardrobe'),
          BottomNavigationBarItem(icon: Icon(Icons.favorite_border), label: 'Saved'),
        ],
      ),
    );
  }
}
