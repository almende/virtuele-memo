//
//  VMOFirstViewController.m
//  Virtuele Memo
//
//  Created by Stefan Kroon on 16-04-14.
//  Copyright (c) 2014 Stefan Kroon. All rights reserved.
//

#import "VMOFirstViewController.h"

@interface VMOFirstViewController ()

@end

@implementation VMOFirstViewController {
    IBOutlet UIView *animationView;
    IBOutlet UIView *animationView1;
    IBOutlet UIView *animationView2;
    IBOutlet UIView *animationView3;
    NSMutableArray *animationImages;
    NSMutableArray *animationImageViews;
}

- (void)viewDidLoad
{
    [super viewDidLoad];
	// Do any additional setup after loading the view, typically from a nib.
    
    NSUInteger nofImages = 12;
    animationImages = [[NSMutableArray alloc] initWithCapacity:nofImages];
    animationImageViews = [[NSMutableArray alloc] initWithCapacity:4];
    for(int c = 0; c < nofImages; c++) {
        UIImage *image = [UIImage imageNamed:[NSString stringWithFormat:@"Signal_%02d.png", c]];
        [animationImages addObject:image];
    }
    
    [self signalAnimationForFrame:[animationView frame]];
    [self signalAnimationForFrame:[animationView1 frame]];
    [self signalAnimationForFrame:[animationView2 frame]];
    [self signalAnimationForFrame:[animationView3 frame]];
}

- (void)viewDidAppear:(BOOL)animated {
    [super viewDidAppear:animated];
    [animationImageViews enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL *stop) {
        [obj startAnimating];
    }];
}

- (void)viewDidDisappear:(BOOL)animated {
    [super viewDidDisappear:animated];
    [animationImageViews enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL *stop) {
        [obj stopAnimating];
    }];
}

- (void)signalAnimationForFrame:(CGRect)frame {
    UIImageView *animationImageView = [[UIImageView alloc] initWithFrame:frame];
    animationImageView.contentMode = UIViewContentModeScaleAspectFit;
    animationImageView.animationImages = animationImages;
    animationImageView.animationDuration = 1.2;
    [self.view addSubview:animationImageView];
    [animationImageViews addObject:animationImageView];
}

- (void)didReceiveMemoryWarning
{
    [super didReceiveMemoryWarning];
    // Dispose of any resources that can be recreated.
}

@end
